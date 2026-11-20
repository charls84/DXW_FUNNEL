const PREFERRED = ["America/Bogota", "America/Mexico_City", "America/Lima", "America/New_York", "America/Los_Angeles", "Europe/Madrid", "UTC"];

/** Zonas horarias frecuentes primero, luego todas las demás. */
export function timezoneOptions(): string[] {
  let all: string[] = [];
  try {
    all = Intl.supportedValuesOf("timeZone");
  } catch {
    all = [];
  }
  const rest = all.filter((tz) => !PREFERRED.includes(tz));
  return [...PREFERRED, ...rest];
}
