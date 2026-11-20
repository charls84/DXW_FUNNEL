"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth";
import { canEditWorkspaces } from "@/lib/permissions";
import { sanitizeDoc } from "@/lib/canvas/doc";
import { TEMPLATES, buildTemplate, isTemplateKey } from "@/lib/canvas/templates";
import type { CanvasDoc } from "@/lib/canvas/types";

export type FormState = { error?: string; success?: string } | null;
type SaveResult = { ok: true; version: number } | { ok: false; reason: "conflict" | "forbidden" | "error" };

const AUTO_REVISION_MS = 10 * 60 * 1000;
const NO_PERMISSION = "Tu rol no permite hacer este cambio. Pide ayuda a un administrador.";

async function requireEditor() {
  const member = await getCurrentMember();
  return { member, canEdit: canEditWorkspaces(member.role) };
}

export async function createCanvas(workspaceId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { member, canEdit } = await requireEditor();
  if (!canEdit) return { error: NO_PERMISSION };

  const name = String(form.get("name") ?? "").trim();
  const template = form.get("template");
  if (!name) return { error: "Escribe un nombre para el mapa." };
  if (name.length > 120) return { error: "Usa un nombre de 120 caracteres o menos." };

  const supabase = await createClient();
  let doc: CanvasDoc;
  let kind: "funnel" | "process";
  let note: string;

  if (typeof template === "string" && template.startsWith("canvas:")) {
    // Plantilla propia de DXW: copia del documento de un mapa marcado como plantilla.
    const { data: src } = await supabase
      .from("canvases")
      .select("name, kind, doc")
      .eq("id", template.slice("canvas:".length))
      .eq("is_template", true)
      .maybeSingle();
    if (!src) return { error: "Esa plantilla ya no está disponible. Elige otra." };
    doc = sanitizeDoc(src.doc);
    kind = src.kind;
    note = `Creado desde la plantilla DXW "${src.name}"`;
  } else if (isTemplateKey(template)) {
    const meta = TEMPLATES.find((t) => t.key === template)!;
    doc = buildTemplate(template);
    kind = meta.kind;
    note = template === "blank" ? "Mapa creado" : `Creado desde "${meta.name}"`;
  } else {
    return { error: "Elige una plantilla." };
  }

  const { data, error } = await supabase
    .from("canvases")
    .insert({ workspace_id: workspaceId, name, kind, doc, created_by: member.userId, updated_by: member.userId })
    .select("id")
    .single();
  if (error || !data) return { error: "No pudimos crear el mapa. Intenta de nuevo." };

  await supabase.from("canvas_revisions").insert({ canvas_id: data.id, doc, note, is_auto: true, created_by: member.userId });

  revalidatePath(`/workspaces/${workspaceId}`);
  redirect(`/canvas/${data.id}`);
}

export async function duplicateCanvas(canvasId: string): Promise<void> {
  const { member, canEdit } = await requireEditor();
  if (!canEdit) return;
  const supabase = await createClient();
  const { data: src } = await supabase.from("canvases").select("workspace_id, name, kind, tags, doc").eq("id", canvasId).maybeSingle();
  if (!src) return;
  const { data } = await supabase
    .from("canvases")
    .insert({
      workspace_id: src.workspace_id,
      name: `${src.name} (copia)`.slice(0, 120),
      kind: src.kind,
      tags: src.tags,
      doc: sanitizeDoc(src.doc),
      created_by: member.userId,
      updated_by: member.userId,
    })
    .select("id")
    .single();
  revalidatePath(`/workspaces/${src.workspace_id}`);
  if (data) redirect(`/canvas/${data.id}`);
}

export async function deleteCanvas(canvasId: string, workspaceId: string): Promise<void> {
  const { canEdit } = await requireEditor();
  if (!canEdit) return;
  const supabase = await createClient();
  await supabase.from("canvases").delete().eq("id", canvasId);
  revalidatePath(`/workspaces/${workspaceId}`);
}

export async function renameCanvas(canvasId: string, name: string): Promise<{ ok: boolean }> {
  const { member, canEdit } = await requireEditor();
  const clean = String(name ?? "").trim();
  if (!canEdit || !clean || clean.length > 120) return { ok: false };
  const supabase = await createClient();
  const { data } = await supabase.from("canvases").update({ name: clean, updated_by: member.userId }).eq("id", canvasId).select("workspace_id");
  if (!data?.length) return { ok: false };
  revalidatePath(`/workspaces/${data[0].workspace_id}`);
  return { ok: true };
}

/** Guarda el documento con control de concurrencia: falla con "conflict" si otra persona guardó antes. */
export async function saveCanvas(canvasId: string, doc: CanvasDoc, expectedVersion: number): Promise<SaveResult> {
  const { member, canEdit } = await requireEditor();
  if (!canEdit) return { ok: false, reason: "forbidden" };
  if (!Number.isInteger(expectedVersion)) return { ok: false, reason: "error" };

  const clean = sanitizeDoc(doc);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("canvases")
    .update({ doc: clean, version: expectedVersion + 1, updated_by: member.userId })
    .eq("id", canvasId)
    .eq("version", expectedVersion)
    .select("version");

  if (error) return { ok: false, reason: "error" };
  if (!data?.length) {
    const { data: exists } = await supabase.from("canvases").select("id").eq("id", canvasId).maybeSingle();
    return { ok: false, reason: exists ? "conflict" : "error" };
  }

  // Versión automática cada 10 minutos de edición.
  const { data: last } = await supabase
    .from("canvas_revisions")
    .select("created_at")
    .eq("canvas_id", canvasId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!last || Date.now() - new Date(last.created_at).getTime() > AUTO_REVISION_MS) {
    await supabase.from("canvas_revisions").insert({ canvas_id: canvasId, doc: clean, is_auto: true, created_by: member.userId });
  }

  return { ok: true, version: data[0].version };
}

export async function listRevisions(canvasId: string) {
  await getCurrentMember();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("canvas_revisions")
    .select("id, note, is_auto, created_at, created_by")
    .eq("canvas_id", canvasId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("No se pudieron cargar las versiones.");

  const authorIds = [...new Set((data ?? []).map((r) => r.created_by).filter(Boolean))] as string[];
  const { data: people } = authorIds.length
    ? await supabase.from("members").select("user_id, full_name, email").in("user_id", authorIds)
    : { data: [] as { user_id: string; full_name: string | null; email: string }[] };
  const names = new Map((people ?? []).map((p) => [p.user_id, p.full_name ?? p.email]));

  return (data ?? []).map((r) => ({
    id: r.id as string,
    note: r.note as string | null,
    isAuto: r.is_auto as boolean,
    createdAt: r.created_at as string,
    author: r.created_by ? names.get(r.created_by) ?? null : null,
  }));
}

export async function createRevision(canvasId: string, note: string): Promise<{ ok: boolean }> {
  const { member, canEdit } = await requireEditor();
  if (!canEdit) return { ok: false };
  const supabase = await createClient();
  const { data: c } = await supabase.from("canvases").select("doc").eq("id", canvasId).maybeSingle();
  if (!c) return { ok: false };
  const { error } = await supabase.from("canvas_revisions").insert({
    canvas_id: canvasId,
    doc: sanitizeDoc(c.doc),
    note: String(note ?? "").trim().slice(0, 200) || null,
    is_auto: false,
    created_by: member.userId,
  });
  return { ok: !error };
}

export async function restoreRevision(
  canvasId: string,
  revisionId: string,
): Promise<{ ok: true; doc: CanvasDoc; version: number } | { ok: false }> {
  const { member, canEdit } = await requireEditor();
  if (!canEdit) return { ok: false };
  const supabase = await createClient();

  const [{ data: rev }, { data: current }] = await Promise.all([
    supabase.from("canvas_revisions").select("doc").eq("id", revisionId).eq("canvas_id", canvasId).maybeSingle(),
    supabase.from("canvases").select("doc, version").eq("id", canvasId).maybeSingle(),
  ]);
  if (!rev || !current) return { ok: false };

  // Respaldo del estado actual antes de restaurar.
  await supabase.from("canvas_revisions").insert({
    canvas_id: canvasId,
    doc: sanitizeDoc(current.doc),
    note: "Antes de restaurar una versión",
    is_auto: true,
    created_by: member.userId,
  });

  const doc = sanitizeDoc(rev.doc);
  const { data, error } = await supabase
    .from("canvases")
    .update({ doc, version: current.version + 1, updated_by: member.userId })
    .eq("id", canvasId)
    .eq("version", current.version)
    .select("version");
  if (error || !data?.length) return { ok: false };
  return { ok: true, doc, version: data[0].version };
}

// ───────────────────────── Detalles: tags y plantilla ─────────────────────────

export async function setCanvasTags(canvasId: string, tags: string[]): Promise<{ ok: boolean }> {
  const { canEdit } = await requireEditor();
  if (!canEdit || !Array.isArray(tags)) return { ok: false };
  const clean = [...new Set(tags.map((t) => String(t).trim().toLowerCase().replace(/\s+/g, " ").slice(0, 30)).filter(Boolean))].slice(0, 10);
  const supabase = await createClient();
  const { data } = await supabase.from("canvases").update({ tags: clean }).eq("id", canvasId).select("workspace_id");
  if (!data?.length) return { ok: false };
  revalidatePath(`/workspaces/${data[0].workspace_id}`);
  return { ok: true };
}

export async function setCanvasTemplate(canvasId: string, isTemplate: boolean): Promise<{ ok: boolean }> {
  const { canEdit } = await requireEditor();
  if (!canEdit) return { ok: false };
  const supabase = await createClient();
  const { data } = await supabase.from("canvases").update({ is_template: isTemplate === true }).eq("id", canvasId).select("id");
  if (!data?.length) return { ok: false };
  revalidatePath("/", "layout");
  return { ok: true };
}

// ───────────────────────── Links de solo lectura ─────────────────────────

export async function listShareLinks(canvasId: string) {
  await getCurrentMember();
  const supabase = await createClient();
  const [{ data: links }, { data: hasPwd }] = await Promise.all([
    supabase
      .from("share_links")
      .select("id, token, show_notes, expires_at, revoked_at, view_count, last_viewed_at, created_at")
      .eq("canvas_id", canvasId)
      .order("created_at", { ascending: false }),
    supabase.rpc("share_links_with_password", { p_canvas_id: canvasId }),
  ]);
  const withPassword = new Set<string>((hasPwd as string[] | null) ?? []);
  return (links ?? []).map((l) => ({
    id: l.id as string,
    token: l.token as string,
    hasPassword: withPassword.has(l.id),
    showNotes: l.show_notes as boolean,
    expiresAt: l.expires_at as string | null,
    revokedAt: l.revoked_at as string | null,
    viewCount: l.view_count as number,
    lastViewedAt: l.last_viewed_at as string | null,
    createdAt: l.created_at as string,
  }));
}

export async function createShareLink(
  canvasId: string,
  opts: { password: string; expiresInDays: number | null; showNotes: boolean },
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const { canEdit } = await requireEditor();
  if (!canEdit) return { ok: false, error: NO_PERMISSION };
  const password = String(opts?.password ?? "");
  if (password && (password.length < 6 || password.length > 72)) {
    return { ok: false, error: "Usa una contraseña de 6 a 72 caracteres, o déjala vacía." };
  }
  const days = opts?.expiresInDays;
  if (days !== null && ![7, 30, 90].includes(Number(days))) return { ok: false, error: "Elige un vencimiento de la lista." };

  const token = randomBytes(24).toString("base64url");
  const expiresAt = days ? new Date(Date.now() + Number(days) * 86_400_000).toISOString() : null;
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_share_link", {
    p_canvas_id: canvasId,
    p_token: token,
    p_password: password || null,
    p_expires_at: expiresAt,
    p_show_notes: opts?.showNotes === true,
  });
  if (error) return { ok: false, error: "No pudimos crear el link. Intenta de nuevo." };
  return { ok: true, token };
}

export async function revokeShareLink(canvasId: string, linkId: string): Promise<{ ok: boolean }> {
  const { canEdit } = await requireEditor();
  if (!canEdit) return { ok: false };
  const supabase = await createClient();
  const { data: link } = await supabase.from("share_links").select("id").eq("id", linkId).eq("canvas_id", canvasId).maybeSingle();
  if (!link) return { ok: false };
  const { error } = await supabase.rpc("revoke_share_link", { p_id: linkId });
  return { ok: !error };
}

// ───────────────────────── Íconos propios ─────────────────────────

/** Solo se aceptan archivos de nuestro bucket público de Storage. */
function isOwnStorageUrl(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!base && url.startsWith(`${base}/storage/v1/object/public/canvas-assets/`);
}

export async function listCustomIcons(workspaceId: string) {
  await getCurrentMember();
  const supabase = await createClient();
  const { data } = await supabase
    .from("custom_icons")
    .select("id, name, url")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []) as { id: string; name: string; url: string }[];
}

export async function addCustomIcon(workspaceId: string, name: string, url: string) {
  const { member, canEdit } = await requireEditor();
  const cleanName = String(name ?? "").trim().slice(0, 80) || "Ícono";
  if (!canEdit || !isOwnStorageUrl(String(url))) return { ok: false as const };
  const supabase = await createClient();
  const { data } = await supabase
    .from("custom_icons")
    .insert({ workspace_id: workspaceId, name: cleanName, url, created_by: member.userId })
    .select("id, name, url")
    .single();
  return data ? { ok: true as const, icon: data as { id: string; name: string; url: string } } : { ok: false as const };
}

export async function deleteCustomIcon(workspaceId: string, iconId: string): Promise<{ ok: boolean }> {
  const { canEdit } = await requireEditor();
  if (!canEdit) return { ok: false };
  const supabase = await createClient();
  const { data } = await supabase.from("custom_icons").delete().eq("id", iconId).eq("workspace_id", workspaceId).select("id");
  return { ok: !!data?.length };
}
