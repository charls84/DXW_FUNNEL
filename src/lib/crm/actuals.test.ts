import { describe, expect, it } from "vitest";
import { computeActuals, crmCatalog, matches } from "./actuals";
import { csvToEvents, parseCsv } from "./csv";
import { sampleSalesEvents } from "./sample";
import type { CrmEvent } from "./types";

const d = (s: string) => new Date(s);
const e = (contactId: string, occurredAt: string, p: Partial<CrmEvent> & Pick<CrmEvent, "type">): CrmEvent => ({
  contactId,
  occurredAt,
  leadSource: null,
  pipeline: "Ventas",
  stage: null,
  value: null,
  owner: null,
  ...p,
});

describe("matches", () => {
  it("filtra por tipo, pipeline, etapa y origen", () => {
    const ev = e("c", "2026-11-01T00:00:00Z", { type: "stage_changed", stage: "Diagnóstico" });
    expect(matches(ev, { type: "stage_changed", stage: "Diagnóstico" })).toBe(true);
    expect(matches(ev, { type: "stage_changed", stage: "Propuesta" })).toBe(false);
    expect(matches(ev, { type: "stage_changed" })).toBe(false); // falta etapa
    expect(matches(ev, { type: "stage_changed", stage: "Diagnóstico", pipeline: "Otro" })).toBe(false);
    const lead = e("c", "2026-11-01T00:00:00Z", { type: "lead_created", leadSource: "LinkedIn" });
    expect(matches(lead, { type: "lead_created", source: "LinkedIn" })).toBe(true);
    expect(matches(lead, { type: "lead_created", source: "Referido" })).toBe(false);
    expect(matches(lead, { type: "lead_created" })).toBe(true);
  });
});

describe("computeActuals", () => {
  const events: CrmEvent[] = [
    e("a", "2026-11-01T10:00:00Z", { type: "lead_created", leadSource: "LinkedIn" }),
    e("b", "2026-11-02T10:00:00Z", { type: "lead_created", leadSource: "Referido" }),
    e("c", "2026-11-03T10:00:00Z", { type: "lead_created", leadSource: "LinkedIn" }),
    e("a", "2026-11-03T10:00:00Z", { type: "stage_changed", stage: "Diagnóstico" }),
    e("b", "2026-11-06T10:00:00Z", { type: "stage_changed", stage: "Diagnóstico" }),
    e("a", "2026-11-05T10:00:00Z", { type: "deal_won", value: 4000 }),
    e("a", "2026-11-05T11:00:00Z", { type: "deal_won", value: 4000 }), // duplicado del mismo contacto: no cuenta dos personas
    e("z", "2026-09-01T10:00:00Z", { type: "lead_created" }), // fuera del período
  ];
  const steps = [
    { id: "lead", crm: { type: "lead_created" as const } },
    { id: "diag", crm: { type: "stage_changed" as const, stage: "Diagnóstico" }, slaHours: 48 },
    { id: "won", crm: { type: "deal_won" as const } },
    { id: "sin", crm: undefined },
  ];
  const edges = [
    { id: "l-d", source: "lead", target: "diag" },
    { id: "d-w", source: "diag", target: "won" },
    { id: "vis", source: "lead", target: "won", visual: true },
  ];
  const r = computeActuals(steps, edges, events, { from: d("2026-10-25T00:00:00Z"), to: d("2026-11-20T00:00:00Z") }, d("2026-11-20T00:00:00Z"));

  it("cuenta contactos distintos por paso y solo dentro del período", () => {
    expect(r.steps.lead.people).toBe(3);
    expect(r.steps.diag.people).toBe(2);
    expect(r.steps.won.people).toBe(1);
    expect(r.steps.sin).toBeUndefined();
    expect(r.totals.contacts).toBe(3);
  });

  it("calcula tasas, tiempos y SLA por línea y paso", () => {
    expect(r.edges["l-d"].people).toBe(2);
    expect(r.edges["l-d"].rate).toBeCloseTo(2 / 3);
    expect(r.edges["l-d"].medianDays).toBeCloseTo(3); // a: 2 días, b: 4 días
    expect(r.edges["d-w"].rate).toBeCloseTo(0.5);
    expect(r.edges.vis).toBeUndefined();
    // diag: a avanzó en 48 h (no supera el SLA de 48 h); b sigue esperando desde el 6/11 (> 48 h)
    expect(r.steps.diag.waiting).toBe(1);
    expect(r.steps.diag.overSla).toBe(1);
    expect(r.steps.diag.avgHoursInStep).toBeCloseTo(48);
  });

  it("suma ingresos de los pasos del mapa y cuenta ventas por contacto", () => {
    expect(r.steps.won.revenue).toBe(8000); // dos eventos con valor
    expect(r.totals.revenue).toBe(8000);
    expect(r.totals.sales).toBe(1);
  });

  it("arma el catálogo de pipelines, etapas y orígenes", () => {
    const c = crmCatalog(events);
    expect(c.pipelines).toEqual(["Ventas"]);
    expect(c.stages.Ventas).toEqual(["Diagnóstico"]);
    expect(c.sources).toEqual(["LinkedIn", "Referido"]);
  });

  it("los eventos de ejemplo producen un embudo coherente", () => {
    const now = d("2026-11-20T00:00:00Z");
    const sample = sampleSalesEvents(90, now);
    const s = computeActuals(
      [
        { id: "lead", crm: { type: "lead_created" } },
        { id: "conv", crm: { type: "stage_changed", stage: "Conversación inicial" } },
        { id: "won", crm: { type: "deal_won" } },
      ],
      [
        { id: "a", source: "lead", target: "conv" },
        { id: "b", source: "conv", target: "won" },
      ],
      sample,
      { from: new Date(now.getTime() - 90 * 86_400_000), to: now },
      now,
    );
    expect(s.steps.lead.people).toBeGreaterThan(50);
    expect(s.steps.conv.people).toBeLessThan(s.steps.lead.people);
    expect(s.steps.won.people).toBeGreaterThan(0);
    expect(s.totals.revenue).toBeGreaterThan(0);
  });
});

describe("CSV", () => {
  it("lee comillas, punto y coma y BOM", () => {
    expect(parseCsv('﻿a;b\n"x;1";"di ""hola"""\n')).toEqual([["a", "b"], ["x;1", 'di "hola"']]);
  });

  it("valida filas y reporta errores claros", () => {
    const csv = [
      "id,type,occurred_at,contact_id,contact_email,source,pipeline,stage,value,currency,owner",
      "e1,lead_created,2026-11-01T10:00:00Z,c1,Ana@Cliente.com,LinkedIn,Ventas,,,,Comercial",
      "e2,stage_changed,2026-11-02T10:00:00Z,c1,,,Ventas,Diagnóstico,,,",
      "e3,deal_won,2026-11-05,c1,,,Ventas,,\"4000,50\",usd,",
      "e4,stage_changed,2026-11-02T10:00:00Z,c2,,,Ventas,,,,",
      "e5,venta,2026-11-02,c3,,,,,,,",
      ",lead_created,2026-11-02,c4,,,,,,,",
    ].join("\n");
    const r = csvToEvents(csv);
    expect(r.total).toBe(6);
    expect(r.rows.map((x) => x.external_id)).toEqual(["e1", "e2", "e3"]);
    expect(r.rows[2].value).toBe(4000.5);
    expect(r.rows[2].currency).toBe("USD");
    expect(r.errors).toEqual([
      "Fila 5: stage_changed necesita stage.",
      'Fila 6: tipo "venta" no válido.',
      "Fila 7: falta id.",
    ]);
  });

  it("rechaza archivos sin columnas obligatorias", () => {
    expect(csvToEvents("nombre,email\nAna,a@b.com").errors[0]).toMatch(/Faltan columnas obligatorias/);
  });
});
