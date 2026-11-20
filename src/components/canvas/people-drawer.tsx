"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { EdgeContact, StepContact } from "@/lib/crm/actuals";
import { useForecast } from "./forecast-context";
import { downloadText, toCsv } from "./export-csv";

export type PeopleTarget = { kind: "step" | "edge"; id: string; label: string };

const fmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });
const dayFmt = (d: number) => (d < 1 ? "<1 d" : `${d.toLocaleString("es-CO", { maximumFractionDigits: 1 })} d`);

/** Quiénes están detrás de un número: contactos del CRM que llegaron a un paso o pasaron por una línea. */
export function PeopleDrawer({ target, onClose }: { target: PeopleTarget; onClose: () => void }) {
  const fc = useForecast();
  const [query, setQuery] = useState("");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const q = query.trim().toLowerCase();

  const stepRows = useMemo(() => (target.kind === "step" ? (fc?.actual?.steps[target.id]?.contacts ?? []) : null), [fc, target]);
  const edgeRows = useMemo(() => (target.kind === "edge" ? (fc?.actual?.edges[target.id]?.contacts ?? []) : null), [fc, target]);

  const filteredSteps = useMemo(() => (stepRows ?? []).filter((c) => !q || c.id.toLowerCase().includes(q) || (c.owner ?? "").toLowerCase().includes(q) || (c.source ?? "").toLowerCase().includes(q)), [stepRows, q]);
  const filteredEdges = useMemo(() => (edgeRows ?? []).filter((c) => !q || c.id.toLowerCase().includes(q)), [edgeRows, q]);
  const total = stepRows?.length ?? edgeRows?.length ?? 0;

  function exportCsv() {
    const rows: (string | number | null)[][] =
      target.kind === "step"
        ? [["contacto", "llegó_el", "responsable", "origen", "valor"], ...filteredSteps.map((c: StepContact) => [c.id, c.at, c.owner, c.source, c.value])]
        : [["contacto", "salió_de_origen", "llegó_a_destino", "días"], ...filteredEdges.map((c: EdgeContact) => [c.id, c.fromAt, c.toAt, Number(c.days.toFixed(1))])];
    downloadText(toCsv(rows), `personas - ${target.label.replace(/[^\p{L}\p{N}\-_ ]/gu, "").trim() || "paso"}.csv`);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="people-title" className="flex h-full w-[28rem] flex-col bg-surface shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 id="people-title" className="font-semibold">Personas · {target.label}</h2>
            <p className="text-xs text-muted">
              {total} {total === 1 ? "contacto" : "contactos"} en los últimos {fc?.settings.days ?? 0} días. Son ids del CRM: el nombre y el email no se guardan aquí.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted hover:bg-canvas" aria-label="Cerrar"><X size={18} /></button>
        </div>

        <div className="flex gap-2 border-b border-line px-4 py-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por id, responsable u origen…" aria-label="Buscar personas" className="input py-1.5" />
          <button type="button" onClick={exportCsv} disabled={total === 0} className="btn-secondary shrink-0 py-1.5 text-xs">Descargar CSV</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!fc?.crm.available && <p className="p-4 text-sm text-muted">Este mapa no tiene datos del CRM.</p>}
          {fc?.crm.available && total === 0 && (
            <p className="p-4 text-sm text-muted">
              {target.kind === "step" ? "Ningún contacto llegó a este paso en el período. Revisa la conexión al CRM del paso o amplía el horizonte." : "Nadie pasó por esta línea en el período. Ambos pasos deben estar conectados al CRM."}
            </p>
          )}
          {stepRows && filteredSteps.length > 0 && (
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-canvas text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Contacto</th>
                  <th className="px-2 py-2 font-medium">Llegó el</th>
                  <th className="px-2 py-2 font-medium">Responsable</th>
                  <th className="px-2 py-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {filteredSteps.slice(0, 500).map((c) => (
                  <tr key={c.id} className="border-t border-line">
                    <td className="px-4 py-1.5 font-mono">{c.id}{c.source ? <span className="ml-1 text-muted">· {c.source}</span> : null}</td>
                    <td className="px-2 py-1.5">{fmt.format(new Date(c.at))}</td>
                    <td className="px-2 py-1.5">{c.owner ?? "—"}</td>
                    <td className="px-2 py-1.5 text-right">{c.value === null ? "—" : fc!.money(c.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {edgeRows && filteredEdges.length > 0 && (
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-canvas text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Contacto</th>
                  <th className="px-2 py-2 font-medium">Llegó al destino</th>
                  <th className="px-2 py-2 text-right font-medium">Tardó</th>
                </tr>
              </thead>
              <tbody>
                {filteredEdges.slice(0, 500).map((c) => (
                  <tr key={c.id} className="border-t border-line">
                    <td className="px-4 py-1.5 font-mono">{c.id}</td>
                    <td className="px-2 py-1.5">{fmt.format(new Date(c.toAt))}</td>
                    <td className="px-2 py-1.5 text-right">{dayFmt(c.days)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {total > 500 && <p className="p-3 text-xs text-muted">Se muestran los primeros 500. El CSV incluye todos.</p>}
        </div>
      </div>
    </div>
  );
}
