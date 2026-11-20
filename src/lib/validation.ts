import type { WorkspaceType } from "@/lib/workspaces";

export type WorkspaceInput = {
  name: string;
  type: WorkspaceType;
  main_url: string | null;
  timezone: string;
  currency: string;
};

export type ValidationResult =
  | { ok: true; value: WorkspaceInput }
  | { ok: false; error: string };

const CURRENCY_RE = /^[A-Z]{3}$/;

/** Valida el formulario de workspace. Mensajes listos para mostrar en la interfaz. */
export function parseWorkspaceForm(form: FormData): ValidationResult {
  const name = String(form.get("name") ?? "").trim();
  const type = String(form.get("type") ?? "client");
  const rawUrl = String(form.get("main_url") ?? "").trim();
  const timezone = String(form.get("timezone") ?? "America/Bogota").trim();
  const currency = String(form.get("currency") ?? "USD").trim().toUpperCase();

  if (!name) return { ok: false, error: "Escribe un nombre para el workspace." };
  if (name.length > 80) return { ok: false, error: "Usa un nombre de 80 caracteres o menos." };
  if (type !== "internal" && type !== "client") return { ok: false, error: "Elige si el workspace es interno o de un cliente." };
  if (!CURRENCY_RE.test(currency)) return { ok: false, error: "Elige una moneda de la lista." };
  if (!isValidTimezone(timezone)) return { ok: false, error: "Elige una zona horaria de la lista." };

  let main_url: string | null = null;
  if (rawUrl) {
    const normalized = rawUrl.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    if (normalized.length > 200 || !/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(normalized)) {
      return { ok: false, error: "Escribe el sitio como dominio, por ejemplo cliente.com." };
    }
    main_url = normalized.toLowerCase();
  }

  return { ok: true, value: { name, type, main_url, timezone, currency } };
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
