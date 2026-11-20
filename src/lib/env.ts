export type SupabaseEnv = { url: string; key: string };

/** Devuelve la configuración pública de Supabase, o null si falta. */
export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || url.includes("TU-PROYECTO")) return null;
  return { url, key };
}

export function getAllowedDomain(): string {
  return (process.env.ALLOWED_EMAIL_DOMAIN ?? "doux.work").trim().toLowerCase();
}
