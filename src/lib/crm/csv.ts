import { CRM_EVENT_TYPES, type CrmEventType } from "./types";

/** Fila lista para guardar (antes de calcular el hash del email en el servidor). */
export type CsvEventRow = {
  external_id: string;
  type: CrmEventType;
  occurred_at: string;
  contact_id: string;
  contact_email: string | null;
  lead_source: string | null;
  pipeline: string | null;
  stage: string | null;
  value: number | null;
  currency: string | null;
  owner: string | null;
};

export const CSV_COLUMNS = ["id", "type", "occurred_at", "contact_id", "contact_email", "source", "pipeline", "stage", "value", "currency", "owner"] as const;
export const MAX_CSV_ROWS = 5000;

/** Parser CSV simple con comillas dobles (RFC 4180). Acepta coma o punto y coma como separador. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

const opt = (v: string | undefined, max = 120) => {
  const t = (v ?? "").trim();
  return t ? t.slice(0, max) : null;
};

/** Convierte el CSV en eventos válidos y lista los errores por fila (máximo 20). */
export function csvToEvents(text: string): { rows: CsvEventRow[]; errors: string[]; total: number } {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], errors: ["El archivo no tiene filas de datos."], total: 0 };
  const header = table[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const missing = ["id", "type", "occurred_at", "contact_id"].filter((c) => idx(c) < 0);
  if (missing.length) return { rows: [], errors: [`Faltan columnas obligatorias: ${missing.join(", ")}.`], total: table.length - 1 };

  const data = table.slice(1);
  if (data.length > MAX_CSV_ROWS) return { rows: [], errors: [`El archivo tiene ${data.length} filas. Divide el archivo en partes de hasta ${MAX_CSV_ROWS}.`], total: data.length };

  const rows: CsvEventRow[] = [];
  const errors: string[] = [];
  data.forEach((r, i) => {
    const line = i + 2;
    const get = (c: string) => (idx(c) >= 0 ? r[idx(c)] : undefined);
    const type = (get("type") ?? "").trim() as CrmEventType;
    const id = opt(get("id"), 200);
    const contact = opt(get("contact_id"), 200);
    const time = Date.parse((get("occurred_at") ?? "").trim());
    const rawValue = (get("value") ?? "").trim().replace(",", ".");
    const value = rawValue ? Number(rawValue) : null;

    const problem = !id
      ? "falta id"
      : !CRM_EVENT_TYPES.includes(type)
        ? `tipo "${get("type") ?? ""}" no válido`
        : !contact
          ? "falta contact_id"
          : !Number.isFinite(time)
            ? "fecha inválida (usa formato ISO, por ejemplo 2026-11-20T10:00:00Z)"
            : value !== null && (!Number.isFinite(value) || value < 0)
              ? "value debe ser un número positivo"
              : type === "stage_changed" && !opt(get("stage"))
                ? "stage_changed necesita stage"
                : null;
    if (problem) {
      if (errors.length < 20) errors.push(`Fila ${line}: ${problem}.`);
      return;
    }
    const currency = (get("currency") ?? "").trim().toUpperCase();
    rows.push({
      external_id: id!,
      type,
      occurred_at: new Date(time).toISOString(),
      contact_id: contact!,
      contact_email: opt(get("contact_email"), 320),
      lead_source: opt(get("source")),
      pipeline: opt(get("pipeline")),
      stage: opt(get("stage")),
      value,
      currency: /^[A-Z]{3}$/.test(currency) ? currency : null,
      owner: opt(get("owner")),
    });
  });
  return { rows, errors, total: data.length };
}
