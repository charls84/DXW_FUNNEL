"use client";

import { CATEGORY_META, getCatalogItem } from "@/lib/canvas/catalog";
import { LINE_TYPE_LABELS } from "@/lib/canvas/types";
import type { AppNode, FlowEdgeT } from "./flow-types";
import type { ForecastView } from "./forecast-context";

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\n");
}

export function downloadText(text: string, fileName: string, mime = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const safeName = (name: string) => name.replace(/[^\p{L}\p{N}\-_ ]/gu, "").trim() || "mapa";
const num = (v: number | null | undefined, digits = 2) => (v === null || v === undefined ? "" : Number(v.toFixed(digits)));

/** CSV de pasos: nombre, tipo, responsable, SLA, simulación y datos reales. */
export function stepsCsv(nodes: AppNode[], fc: ForecastView, mapName: string) {
  const head = [
    "id", "nombre", "categoría", "tipo", "responsable", "sla_horas", "conexión_crm",
    "sim_personas", "sim_gasto", "sim_ingresos", "sim_meta",
    "real_personas", "real_ingresos", "real_horas_en_paso", "real_en_espera", "real_fuera_sla",
  ];
  const rows: (string | number | null | undefined)[][] = [head];
  for (const n of nodes) {
    if (n.type !== "step") continue;
    const sim = fc.result.steps[n.id];
    const real = fc.actual?.steps[n.id];
    const crm = n.data.crm;
    rows.push([
      n.id,
      n.data.label,
      CATEGORY_META[n.data.category]?.label ?? n.data.category,
      getCatalogItem(n.data.catalogKey).label,
      n.data.process?.owner ?? "",
      n.data.process?.slaHours ?? "",
      crm ? [crm.type, crm.pipeline, crm.stage, crm.source].filter(Boolean).join(" / ") : "",
      num(sim?.people), num(sim?.cost), num(sim?.revenue), num(sim?.goalValue),
      real ? real.people : "", num(real?.revenue), num(real?.avgHoursInStep, 1), real ? real.waiting : "", real ? real.overSla : "",
    ]);
  }
  downloadText(toCsv(rows), `${safeName(mapName)} - pasos.csv`);
}

/** CSV de líneas: origen, destino, tipo, tasas y personas simuladas y reales. */
export function edgesCsv(nodes: AppNode[], edges: FlowEdgeT[], fc: ForecastView, mapName: string) {
  const label = new Map(nodes.map((n) => [n.id, n.type === "step" ? n.data.label : n.type === "text" ? n.data.text.slice(0, 40) : n.type]));
  const head = ["id", "origen", "destino", "tipo_línea", "etiqueta", "sim_tasa_%", "sim_personas", "real_tasa_%", "real_personas", "real_mediana_días"];
  const rows: (string | number | null | undefined)[][] = [head];
  for (const e of edges) {
    const sim = fc.result.edges[e.id];
    const real = fc.actual?.edges[e.id];
    rows.push([
      e.id,
      label.get(e.source) ?? e.source,
      label.get(e.target) ?? e.target,
      LINE_TYPE_LABELS[e.data?.lineType ?? "direct"],
      e.data?.label ?? "",
      sim?.rate === null || sim?.rate === undefined ? "" : num(sim.rate * 100, 1),
      num(sim?.people),
      real?.rate === null || real?.rate === undefined ? "" : num(real.rate * 100, 1),
      real ? real.people : "",
      num(real?.medianDays, 1),
    ]);
  }
  downloadText(toCsv(rows), `${safeName(mapName)} - líneas.csv`);
}
