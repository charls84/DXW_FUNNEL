import { describe, expect, it } from "vitest";
import { computeForecast, edgeRate, periodMultiplier, resolveVolume, type EngineEdge, type EngineStep } from "./engine";
import { DEFAULT_FACTORS } from "./types";

const settings = (days = 30, expenses = [] as { id: string; name: string; amount: number; period: "day" | "week" | "month" | "fixed" }[]) => ({
  days,
  expenses,
  factors: DEFAULT_FACTORS,
});

describe("utilidades", () => {
  it("convierte períodos al horizonte", () => {
    expect(periodMultiplier("day", 31)).toBe(31);
    expect(periodMultiplier("week", 28)).toBe(4);
    expect(periodMultiplier("month", 90)).toBe(3);
    expect(periodMultiplier("fixed", 90)).toBe(1);
  });

  it("calcula el tercer valor según el modo de entrada", () => {
    expect(resolveVolume({ inputs: "people_spend", people: 100, spend: 200 })).toEqual({ people: 100, spend: 200, cpp: 2 });
    expect(resolveVolume({ inputs: "people_cpp", people: 100, costPerPerson: 3 })).toEqual({ people: 100, spend: 300, cpp: 3 });
    expect(resolveVolume({ inputs: "spend_cpp", spend: 500, costPerPerson: 5 })).toEqual({ people: 100, spend: 500, cpp: 5 });
    expect(resolveVolume({ inputs: "spend_cpp", spend: 500 }).people).toBe(0);
  });

  it("aplica factores y overrides de escenario, sin pasar de 100 %", () => {
    expect(edgeRate({ rate: 40 }, "expected")).toBeCloseTo(0.4);
    expect(edgeRate({ rate: 40 }, "conservative")).toBeCloseTo(0.32);
    expect(edgeRate({ rate: 40, optimistic: 55 }, "optimistic")).toBeCloseTo(0.55);
    expect(edgeRate({ rate: 90 }, "optimistic")).toBe(1);
    expect(edgeRate({}, "expected")).toBeNull();
  });
});

describe("computeForecast", () => {
  it("reproduce el ejemplo del demo de Funnelytics (31 días)", () => {
    const steps: EngineStep[] = [
      { id: "ads", forecast: { period: "day", inputs: "people_spend", people: 105.16129032258064, spend: 200 } },
      { id: "page", forecast: {} },
      { id: "buy", forecast: { avgValue: 350 } },
    ];
    const edges: EngineEdge[] = [
      { id: "e1", source: "ads", target: "page", forecast: { rate: 100 } },
      { id: "e2", source: "page", target: "buy", forecast: { rate: 28 / 3260 * 100 } },
    ];
    const r = computeForecast(steps, edges, settings(31), "expected");
    expect(r.steps.ads.people).toBeCloseTo(3260, 0);
    expect(r.totals.adSpend).toBeCloseTo(6200);
    expect(r.steps.buy.people).toBeCloseTo(28, 5);
    expect(r.totals.revenue).toBeCloseTo(9800, 3);
    expect(r.totals.profit).toBeCloseTo(3600, 3);
    expect(r.totals.roi).toBeCloseTo(3600 / 6200, 5);
  });

  it("suma varias entradas y cuenta clientes, gastos manuales y costo por cliente", () => {
    const steps: EngineStep[] = [
      { id: "a", forecast: { period: "month", inputs: "people_spend", people: 1000, spend: 500 } },
      { id: "b", forecast: { period: "month", inputs: "people_spend", people: 200, spend: 0 } },
      { id: "lead" },
      { id: "won", forecast: { avgValue: 1000, goalValue: 50 } },
    ];
    const edges: EngineEdge[] = [
      { id: "a-lead", source: "a", target: "lead", forecast: { rate: 10 } },
      { id: "b-lead", source: "b", target: "lead", forecast: { rate: 50 } },
      { id: "lead-won", source: "lead", target: "won", forecast: { rate: 20 } },
    ];
    const r = computeForecast(steps, edges, settings(30, [{ id: "x", name: "Software", amount: 100, period: "month" }]), "expected");
    expect(r.steps.lead.people).toBeCloseTo(200);
    expect(r.steps.won.people).toBeCloseTo(40);
    expect(r.totals.entering).toBe(1200);
    expect(r.totals.cost).toBe(600);
    expect(r.totals.revenue).toBe(40000);
    expect(r.totals.goalValue).toBe(2000);
    expect(r.totals.customers).toBeCloseTo(40);
    expect(r.totals.costPerCustomer).toBeCloseTo(15);
  });

  it("los escenarios cambian volumen y tasas", () => {
    const steps: EngineStep[] = [{ id: "a", forecast: { period: "fixed", people: 1000 } }, { id: "b" }];
    const edges: EngineEdge[] = [{ id: "e", source: "a", target: "b", forecast: { rate: 50 } }];
    expect(computeForecast(steps, edges, settings(), "expected").steps.b.people).toBeCloseTo(500);
    expect(computeForecast(steps, edges, settings(), "conservative").steps.b.people).toBeCloseTo(1000 * 0.9 * 0.4);
    expect(computeForecast(steps, edges, settings(), "optimistic").steps.b.people).toBeCloseTo(1000 * 1.1 * 0.6);
  });

  it("ignora líneas visuales, reporta líneas sin tasa y corta ciclos sin bloquearse", () => {
    const steps: EngineStep[] = [
      { id: "src", forecast: { period: "fixed", people: 100 } },
      { id: "lead" },
      { id: "lost" },
      { id: "x" },
    ];
    const edges: EngineEdge[] = [
      { id: "s-l", source: "src", target: "lead", forecast: { rate: 100 } },
      { id: "l-lost", source: "lead", target: "lost", forecast: { rate: 30 } },
      { id: "lost-l", source: "lost", target: "lead", forecast: { rate: 10 } }, // ciclo
      { id: "l-x", source: "lead", target: "x" }, // sin tasa
      { id: "vis", source: "src", target: "x", visual: true, forecast: { rate: 100 } },
    ];
    const r = computeForecast(steps, edges, settings(), "expected");
    expect(r.steps.lead.people).toBe(100);
    expect(r.steps.lost.people).toBe(30);
    expect(r.steps.x.people).toBe(0);
    expect(r.warnings.cycleEdges).toEqual(["lost-l"]);
    expect(r.warnings.edgesWithoutRate).toEqual(["l-x"]);
    expect(r.edges.vis).toBeUndefined();
  });

  it("avisa de pasos de entrada sin volumen y no divide por cero", () => {
    const r = computeForecast([{ id: "a" }, { id: "b" }], [{ id: "e", source: "a", target: "b", forecast: { rate: 50 } }], settings(), "expected");
    expect(r.warnings.rootsWithoutVolume).toEqual(["a"]);
    expect(r.totals.roi).toBeNull();
    expect(r.totals.roas).toBeNull();
    expect(r.totals.costPerCustomer).toBeNull();
  });
});

describe("plantillas con cifras de ejemplo", () => {
  it("todas las plantillas simulan sin líneas sin tasa ni ciclos y con ingresos > 0", async () => {
    const { TEMPLATES, buildTemplate } = await import("@/lib/canvas/templates");
    const { sanitizeDoc } = await import("@/lib/canvas/doc");
    for (const t of TEMPLATES.filter((x) => x.key !== "blank")) {
      const doc = sanitizeDoc(JSON.parse(JSON.stringify(buildTemplate(t.key))));
      const steps = doc.nodes.flatMap((n) => (n.type === "step" ? [{ id: n.id, forecast: n.data.forecast }] : []));
      const edges = doc.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, visual: e.data.lineType === "visual", forecast: e.data.forecast }));
      const r = computeForecast(steps, edges, doc.forecast!, "expected");
      expect(r.warnings.edgesWithoutRate, t.key).toEqual([]);
      expect(r.warnings.cycleEdges, t.key).toEqual([]);
      expect(r.totals.revenue, t.key).toBeGreaterThan(0);
      expect(doc.nodes.some((n) => n.type === "widget"), t.key).toBe(true);
    }
  });
});
