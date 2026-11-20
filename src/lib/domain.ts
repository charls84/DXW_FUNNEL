/**
 * true si el correo pertenece exactamente al dominio permitido.
 * Rechaza subdominios ("a@x.doux.work") y dominios parecidos ("a@doux.work.evil.com").
 */
export function isAllowedEmail(email: string | null | undefined, domain: string): boolean {
  if (!email || !domain) return false;
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at <= 0 || at !== normalized.indexOf("@")) return false;
  return normalized.slice(at + 1) === domain.trim().toLowerCase();
}
