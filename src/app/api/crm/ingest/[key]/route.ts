import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/env";

const MAX_BYTES = 1_000_000;
const KEY_RE = /^[A-Za-z0-9_-]{20,64}$/;

/**
 * Webhook del CRM propio de DXW.
 * POST /api/crm/ingest/<clave>  ·  Header: X-DXW-Signature: sha256=<hmac hex del cuerpo>
 * La verificación de la firma y el guardado ocurren en Postgres (ingest_crm_events), sin claves de servicio.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/crm/ingest/[key]">) {
  const { key } = await ctx.params;
  if (!KEY_RE.test(key)) return Response.json({ error: "Clave de conexión inválida." }, { status: 404 });

  const env = getSupabaseEnv();
  if (!env) return Response.json({ error: "Servicio no configurado." }, { status: 503 });

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) return Response.json({ error: "El cuerpo supera 1 MB. Envía lotes más pequeños." }, { status: 413 });

  const body = await request.text();
  if (body.length > MAX_BYTES) return Response.json({ error: "El cuerpo supera 1 MB. Envía lotes más pequeños." }, { status: 413 });

  const signature = request.headers.get("x-dxw-signature");
  if (!signature) return Response.json({ error: "Falta el header X-DXW-Signature." }, { status: 401 });

  const supabase = createClient(env.url, env.key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc("ingest_crm_events", { p_key: key, p_signature: signature, p_body: body });
  if (error || !data) return Response.json({ error: "No pudimos procesar los eventos. Intenta de nuevo." }, { status: 500 });

  const r = data as { status: string; accepted?: number; duplicates?: number; rejected?: number; errors?: unknown[]; max?: number };
  switch (r.status) {
    case "ok":
      return Response.json({ accepted: r.accepted, duplicates: r.duplicates, rejected: r.rejected, errors: r.errors }, { status: 200 });
    case "unknown_key":
      return Response.json({ error: "Clave de conexión inválida." }, { status: 404 });
    case "bad_signature":
      return Response.json({ error: "Firma inválida." }, { status: 401 });
    case "bad_json":
      return Response.json({ error: "El cuerpo no es JSON válido." }, { status: 400 });
    case "too_many_events":
      return Response.json({ error: `Máximo ${r.max ?? 500} eventos por envío.` }, { status: 413 });
    default:
      return Response.json({ error: "No pudimos procesar los eventos." }, { status: 500 });
  }
}
