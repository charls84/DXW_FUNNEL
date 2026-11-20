"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth";
import { canEditWorkspaces, canManageMembers } from "@/lib/permissions";
import { CRM_EVENT_TYPES, type CrmEvent } from "@/lib/crm/types";
import { MAX_CSV_ROWS, type CsvEventRow } from "@/lib/crm/csv";

const MAX_EVENTS = 50_000;

export type CrmConnection = { ingestKey: string; secret: string; createdAt: string; lastEventAt: string | null; eventsReceived: number };
export type CrmStatus = { connected: boolean; lastEventAt: string | null; eventsReceived: number; eventsStored: number };

/** Eventos del período para calcular los datos reales del mapa. RLS limita a miembros. */
export async function listCrmEvents(workspaceId: string, fromIso: string, toIso: string): Promise<CrmEvent[]> {
  await getCurrentMember();
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) return [];
  const supabase = await createClient();
  // Supabase devuelve como máximo 1.000 filas por consulta: se pagina.
  const PAGE = 1000;
  type Row = { type: CrmEvent["type"]; occurred_at: string; contact_id: string; lead_source: string | null; pipeline: string | null; stage: string | null; value: number | string | null; owner: string | null };
  const data: Row[] = [];
  for (let offset = 0; offset < MAX_EVENTS; offset += PAGE) {
    const { data: page, error } = await supabase
      .from("crm_events")
      .select("type, occurred_at, contact_id, lead_source, pipeline, stage, value, owner")
      .eq("workspace_id", workspaceId)
      .gte("occurred_at", from.toISOString())
      .lte("occurred_at", to.toISOString())
      .order("occurred_at")
      .order("id")
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error("No pudimos cargar los eventos del CRM.");
    data.push(...((page ?? []) as Row[]));
    if (!page || page.length < PAGE) break;
  }
  return data.map((r) => ({
    type: r.type,
    occurredAt: r.occurred_at,
    contactId: r.contact_id,
    leadSource: r.lead_source,
    pipeline: r.pipeline,
    stage: r.stage,
    value: r.value === null ? null : Number(r.value),
    owner: r.owner,
  }));
}

export async function getCrmStatus(workspaceId: string): Promise<CrmStatus> {
  await getCurrentMember();
  const supabase = await createClient();
  const [{ data: status }, { count }] = await Promise.all([
    supabase.rpc("crm_connection_status", { p_workspace_id: workspaceId }),
    supabase.from("crm_events").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
  ]);
  const s = status as { connected?: boolean; last_event_at?: string | null; events_received?: number } | null;
  return { connected: !!s?.connected, lastEventAt: s?.last_event_at ?? null, eventsReceived: s?.events_received ?? 0, eventsStored: count ?? 0 };
}

/** Clave y secreto del webhook. Solo administradores. */
export async function getCrmConnection(workspaceId: string): Promise<CrmConnection | null> {
  const member = await getCurrentMember();
  if (!canManageMembers(member.role)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("crm_connections")
    .select("ingest_key, secret, created_at, last_event_at, events_received")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!data) return null;
  return { ingestKey: data.ingest_key, secret: data.secret, createdAt: data.created_at, lastEventAt: data.last_event_at, eventsReceived: data.events_received };
}

export async function createCrmConnection(workspaceId: string): Promise<{ ok: boolean; error?: string }> {
  const member = await getCurrentMember();
  if (!canManageMembers(member.role)) return { ok: false, error: "Solo un administrador puede conectar el CRM." };
  const supabase = await createClient();
  const { error } = await supabase.from("crm_connections").insert({
    workspace_id: workspaceId,
    ingest_key: randomBytes(18).toString("base64url"),
    secret: randomBytes(32).toString("base64url"),
    created_by: member.userId,
  });
  if (error) return { ok: false, error: "No pudimos crear la conexión. Intenta de nuevo." };
  revalidatePath(`/workspaces/${workspaceId}/crm`);
  return { ok: true };
}

export async function rotateCrmSecret(workspaceId: string): Promise<{ ok: boolean }> {
  const member = await getCurrentMember();
  if (!canManageMembers(member.role)) return { ok: false };
  const supabase = await createClient();
  const { data } = await supabase
    .from("crm_connections")
    .update({ secret: randomBytes(32).toString("base64url"), rotated_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .select("workspace_id");
  revalidatePath(`/workspaces/${workspaceId}/crm`);
  return { ok: !!data?.length };
}

export async function deleteCrmConnection(workspaceId: string): Promise<{ ok: boolean }> {
  const member = await getCurrentMember();
  if (!canManageMembers(member.role)) return { ok: false };
  const supabase = await createClient();
  const { data } = await supabase.from("crm_connections").delete().eq("workspace_id", workspaceId).select("workspace_id");
  revalidatePath(`/workspaces/${workspaceId}/crm`);
  return { ok: !!data?.length };
}

/** Importación CSV (histórico). Guarda solo el hash del email. Ignora eventos ya importados (mismo id). */
export async function importCrmCsv(
  workspaceId: string,
  rows: CsvEventRow[],
): Promise<{ ok: true; inserted: number; skipped: number } | { ok: false; error: string }> {
  const member = await getCurrentMember();
  if (!canEditWorkspaces(member.role)) return { ok: false, error: "Tu rol no permite importar eventos." };
  if (!Array.isArray(rows) || rows.length === 0) return { ok: false, error: "No hay filas válidas para importar." };
  if (rows.length > MAX_CSV_ROWS) return { ok: false, error: `Máximo ${MAX_CSV_ROWS} filas por archivo.` };

  const clean = rows
    .filter((r) => r && CRM_EVENT_TYPES.includes(r.type) && r.external_id && r.contact_id && Number.isFinite(Date.parse(r.occurred_at)))
    .map((r) => {
      const email = (r.contact_email ?? "").trim().toLowerCase();
      return {
        workspace_id: workspaceId,
        external_id: String(r.external_id).slice(0, 200),
        type: r.type,
        occurred_at: new Date(r.occurred_at).toISOString(),
        contact_id: String(r.contact_id).slice(0, 200),
        email_hash: email.includes("@") ? createHash("sha256").update(email).digest("hex") : null,
        lead_source: r.lead_source?.slice(0, 120) ?? null,
        pipeline: r.pipeline?.slice(0, 120) ?? null,
        stage: r.stage?.slice(0, 120) ?? null,
        value: typeof r.value === "number" && Number.isFinite(r.value) && r.value >= 0 ? r.value : null,
        currency: r.currency && /^[A-Z]{3}$/.test(r.currency) ? r.currency : null,
        owner: r.owner?.slice(0, 120) ?? null,
        origin: "csv" as const,
      };
    });

  const supabase = await createClient();
  let inserted = 0;
  for (let i = 0; i < clean.length; i += 1000) {
    const batch = clean.slice(i, i + 1000);
    const { data, error } = await supabase
      .from("crm_events")
      .upsert(batch, { onConflict: "workspace_id,external_id", ignoreDuplicates: true })
      .select("id");
    if (error) return { ok: false, error: `No pudimos importar todas las filas (${inserted} guardadas). Intenta de nuevo con el mismo archivo: las repetidas se ignoran.` };
    inserted += data?.length ?? 0;
  }
  revalidatePath(`/workspaces/${workspaceId}/crm`);
  return { ok: true, inserted, skipped: clean.length - inserted };
}

export async function deleteAllCrmEvents(workspaceId: string, confirmText: string): Promise<{ ok: boolean; error?: string }> {
  const member = await getCurrentMember();
  if (!canManageMembers(member.role)) return { ok: false, error: "Solo un administrador puede borrar eventos." };
  if (confirmText !== "BORRAR") return { ok: false, error: 'Escribe BORRAR para confirmar.' };
  const supabase = await createClient();
  const { error } = await supabase.from("crm_events").delete().eq("workspace_id", workspaceId);
  revalidatePath(`/workspaces/${workspaceId}/crm`);
  return error ? { ok: false, error: "No pudimos borrar los eventos. Intenta de nuevo." } : { ok: true };
}
