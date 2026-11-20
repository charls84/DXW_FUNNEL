"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CSV_COLUMNS, csvToEvents, type CsvEventRow } from "@/lib/crm/csv";

type Result = { ok: true; inserted: number; skipped: number } | { ok: false; error: string };

const TEMPLATE = [
  CSV_COLUMNS.join(","),
  "evt_1,lead_created,2026-10-01T10:00:00Z,c_1,ana@cliente.com,LinkedIn,Ventas,,,,Comercial",
  "evt_2,stage_changed,2026-10-03T15:00:00Z,c_1,,,Ventas,Diagnóstico,,,Consultor",
  "evt_3,deal_won,2026-10-20T18:00:00Z,c_1,,,Ventas,,4000,USD,Comercial",
].join("\n");

export function CsvImport({ importRows }: { importRows: (rows: CsvEventRow[]) => Promise<Result> }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<{ name: string; rows: CsvEventRow[]; errors: string[]; total: number } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    setResult(null);
    setError(null);
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setError("El archivo pesa más de 5 MB. Divídelo en partes.");
    const text = await file.text();
    setParsed({ name: file.name, ...csvToEvents(text) });
  }

  function confirmImport() {
    if (!parsed?.rows.length) return;
    start(async () => {
      const r = await importRows(parsed.rows);
      if (r.ok) {
        setResult(`${r.inserted} eventos importados${r.skipped ? ` · ${r.skipped} ya existían y se ignoraron` : ""}.`);
        setParsed(null);
        router.refresh();
      } else setError(r.error);
    });
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-eventos-crm.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs text-muted">
        Columnas: <code className="font-mono">{CSV_COLUMNS.join(", ")}</code>. Obligatorias: id, type, occurred_at y contact_id. Fechas en formato ISO.
      </p>
      <div className="flex flex-wrap gap-2">
        <input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
        <button type="button" onClick={() => input.current?.click()} disabled={pending} className="btn-secondary">Elegir archivo CSV</button>
        <button type="button" onClick={downloadTemplate} className="btn-secondary">Descargar plantilla</button>
      </div>

      {parsed && (
        <div className="rounded-md border border-line p-3 text-sm">
          <p className="font-medium">{parsed.name}</p>
          <p className="text-muted">
            {parsed.rows.length} de {parsed.total} filas válidas{parsed.errors.length > 0 && ` · ${parsed.total - parsed.rows.length} con errores`}.
          </p>
          {parsed.errors.length > 0 && (
            <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto text-xs text-danger">
              {parsed.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={confirmImport} disabled={pending || parsed.rows.length === 0} className="btn-primary">
              {pending ? "Importando…" : `Importar ${parsed.rows.length} eventos`}
            </button>
            <button type="button" onClick={() => setParsed(null)} disabled={pending} className="btn-secondary">Cancelar</button>
          </div>
          {parsed.errors.length > 0 && parsed.rows.length > 0 && (
            <p className="mt-2 text-xs text-muted">Las filas con errores no se importan. Corrígelas y sube el archivo otra vez cuando quieras.</p>
          )}
        </div>
      )}
      {result && <p role="status" className="text-sm text-success">{result}</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
