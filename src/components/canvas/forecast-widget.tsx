"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { Calculator } from "lucide-react";
import { SCENARIO_LABELS, type Scenario } from "@/lib/forecast/types";
import type { WidgetNodeT } from "./flow-types";
import { useForecast } from "./forecast-context";

const ORDER: Scenario[] = ["conservative", "expected", "optimistic"];

/** Resumen de la simulación sobre el lienzo. Se exporta en el PNG y se ve en los links compartidos. */
export const ForecastWidgetNode = memo(function ForecastWidgetNode({ selected }: NodeProps<WidgetNodeT>) {
  const fc = useForecast();
  if (!fc) return null;
  const { result, settings, byScenario, money, count, percent } = fc;
  const t = result.totals;
  const w = result.warnings;
  const warnings = [
    w.rootsWithoutVolume.length > 0 && `${w.rootsWithoutVolume.length} ${w.rootsWithoutVolume.length === 1 ? "paso de entrada no tiene" : "pasos de entrada no tienen"} volumen.`,
    w.edgesWithoutRate.length > 0 && `${w.edgesWithoutRate.length} ${w.edgesWithoutRate.length === 1 ? "línea no tiene" : "líneas no tienen"} tasa de conversión.`,
    w.cycleEdges.length > 0 && `${w.cycleEdges.length} ${w.cycleEdges.length === 1 ? "línea cierra" : "líneas cierran"} un ciclo y no suma personas.`,
  ].filter(Boolean) as string[];

  const kpis: { label: string; value: string; tone?: "good" | "bad" }[] = [
    { label: "Personas que entran", value: count(t.entering) },
    { label: "Ventas", value: count(t.customers) },
    { label: "Ingresos", value: money(t.revenue), tone: "good" },
    { label: "Gasto total", value: money(t.cost), tone: "bad" },
    { label: "Utilidad", value: money(t.profit), tone: t.profit >= 0 ? "good" : "bad" },
    { label: "ROI", value: percent(t.roi), tone: (t.roi ?? 0) >= 0 ? "good" : "bad" },
    { label: "ROAS", value: t.roas === null ? "—" : `${t.roas.toLocaleString("es-CO", { maximumFractionDigits: 1 })}×` },
    { label: "Costo por venta", value: t.costPerCustomer === null ? "—" : money(t.costPerCustomer) },
  ];

  return (
    <div className={`w-[460px] rounded-xl border bg-surface p-4 text-ink shadow-md ${selected ? "border-accent ring-4 ring-accent/20" : "border-line"}`}>
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-ink">
          <Calculator size={15} aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold">Simulación</p>
          <p className="text-[11px] text-muted">
            {settings.days} días · Escenario {SCENARIO_LABELS[settings.scenario].toLowerCase()} · Cifras estimadas
          </p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-4 gap-2">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-md bg-canvas px-2 py-1.5">
            <dt className="text-[10px] leading-tight text-muted">{k.label}</dt>
            <dd className={`text-sm font-semibold ${k.tone === "good" ? "text-success" : k.tone === "bad" ? "text-danger" : ""}`}>{k.value}</dd>
          </div>
        ))}
      </dl>

      <table className="mt-3 w-full text-[11px]">
        <caption className="sr-only">Comparación de escenarios</caption>
        <thead className="text-muted">
          <tr>
            <th className="py-1 text-left font-medium">Escenario</th>
            <th className="py-1 text-right font-medium">Ventas</th>
            <th className="py-1 text-right font-medium">Ingresos</th>
            <th className="py-1 text-right font-medium">Utilidad</th>
            <th className="py-1 text-right font-medium">ROI</th>
          </tr>
        </thead>
        <tbody>
          {ORDER.map((s) => {
            const r = byScenario[s].totals;
            return (
              <tr key={s} className={`border-t border-line ${s === settings.scenario ? "font-semibold" : ""}`}>
                <td className="py-1">{SCENARIO_LABELS[s]}</td>
                <td className="py-1 text-right">{count(r.customers)}</td>
                <td className="py-1 text-right">{money(r.revenue)}</td>
                <td className={`py-1 text-right ${r.profit < 0 ? "text-danger" : ""}`}>{money(r.profit)}</td>
                <td className="py-1 text-right">{percent(r.roi)}</td>
              </tr>
            );
          })}
          {fc.actual && settings.view !== "forecast" && (
            <tr className="border-t-2 border-line font-semibold text-success">
              <td className="py-1">Real (CRM)</td>
              <td className="py-1 text-right">{count(fc.actual.totals.sales)}</td>
              <td className="py-1 text-right">{money(fc.actual.totals.revenue)}</td>
              <td className="py-1 text-right text-muted" title="El CRM no informa gastos: compara ventas e ingresos.">—</td>
              <td className="py-1 text-right text-muted">—</td>
            </tr>
          )}
        </tbody>
      </table>

      {fc.crm.available && settings.view !== "forecast" && (
        <p className="mt-2 text-[11px] text-muted">
          {fc.crm.loading
            ? "Cargando datos del CRM…"
            : fc.crm.error
              ? fc.crm.error
              : fc.actual && fc.actual.totals.contacts > 0
                ? `Real: ${count(fc.actual.totals.contacts)} contactos con actividad en los últimos ${settings.days} días · ${fc.actual.totals.mappedSteps} pasos conectados al CRM.`
                : `Sin eventos del CRM en los últimos ${settings.days} días.`}
        </p>
      )}

      {warnings.length > 0 && (
        <ul className="mt-3 space-y-0.5 rounded-md bg-canvas px-2 py-1.5 text-[11px] text-muted">
          {warnings.map((w) => (
            <li key={w}>• {w}</li>
          ))}
        </ul>
      )}
    </div>
  );
});
