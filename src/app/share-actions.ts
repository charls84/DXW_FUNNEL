"use server";

import { createClient } from "@/lib/supabase/server";
import { sanitizeDoc } from "@/lib/canvas/doc";
import type { CanvasDoc } from "@/lib/canvas/types";

export type SharedResult =
  | { status: "ok"; name: string; updatedAt: string; doc: CanvasDoc }
  | { status: "password_required" | "wrong_password" | "expired" | "not_found" | "error" };

const TOKEN_RE = /^[A-Za-z0-9_-]{24,64}$/;

/** Lectura pública de un mapa compartido. No requiere sesión: la validación la hace get_shared_canvas en Postgres. */
export async function openSharedCanvas(token: string, password?: string): Promise<SharedResult> {
  if (!TOKEN_RE.test(String(token))) return { status: "not_found" };
  let data: unknown;
  try {
    const supabase = await createClient();
    const res = await supabase.rpc("get_shared_canvas", {
      p_token: token,
      p_password: password ? String(password).slice(0, 72) : null,
    });
    if (res.error || !res.data) return { status: "error" };
    data = res.data;
  } catch {
    return { status: "error" };
  }
  const r = data as { status: string; name?: string; updated_at?: string; doc?: unknown };
  if (r.status === "ok") {
    return { status: "ok", name: r.name ?? "Mapa", updatedAt: r.updated_at ?? "", doc: sanitizeDoc(r.doc) };
  }
  if (["password_required", "wrong_password", "expired", "not_found"].includes(r.status)) {
    return { status: r.status as "password_required" | "wrong_password" | "expired" | "not_found" };
  }
  return { status: "error" };
}
