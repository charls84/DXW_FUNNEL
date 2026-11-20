import type { EdgeForecast, ForecastSettings, InputMode, ManualExpense, Period, Scenario, StepForecast } from "./types";
import { DEFAULT_FACTORS } from "./types";

/** Entrada mínima del motor: independiente de React Flow y del documento completo. */
export type EngineStep = { id: string; forecast?: StepForecast };
export type EngineEdge = { id: string; source: string; target: string; visual?: boolean; forecast?: EdgeForecast };

export type StepResult = {
  people: number;
  cost: number;        // gasto de entrada (solo pasos de entrada)
  revenue: number;
  goalValue: number;
  isRoot: boolean;
  costPerPerson: number | null;
};

export type EdgeResult = { people: number; rate: number | null };

export type ForecastResult = {
  scenario: Scenario;
  steps: Record<string, StepResult>;
  edges: Record<string, EdgeResult>;
  totals: {
    entering: number;       // personas que entran por los pasos de entrada
    adSpend: number;        // gasto de los pasos de entrada
    manualExpenses: number;
    cost: number;           // gasto total
    revenue: number;
    goalValue: number;
    profit: number;
    roi: number | null;     // (ingresos − costos) / costos
    roas: number | null;    // ingresos / gasto de entrada
    customers: number;      // ventas: personas que llegan a pasos con ingreso por persona (una recompra cuenta otra vez)
    costPerCustomer: number | null;
  };
  warnings: {
    edgesWithoutRate: string[];
    cycleEdges: string[];
    rootsWithoutVolume: string[];
  };
};

/** Cuántas veces cabe un período en el horizonte. */
export function periodMultiplier(period: Period | undefined, days: number): number {
  const d = Math.max(0, days);
  switch (period ?? "month") {
    case "day":
      return d;
    case "week":
      return d / 7;
    case "month":
      return d / 30;
    case "fixed":
      return 1;
  }
}

const pos = (v: number | undefined) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);

/** Resuelve personas, gasto y costo por persona de un paso de entrada (por período). */
export function resolveVolume(f: StepForecast | undefined): { people: number; spend: number; cpp: number | null } {
  const mode: InputMode = f?.inputs ?? "people_spend";
  const people = pos(f?.people);
  const spend = pos(f?.spend);
  const cpp = pos(f?.costPerPerson);
  switch (mode) {
    case "people_spend":
      return { people, spend, cpp: people > 0 && spend > 0 ? spend / people : null };
    case "people_cpp":
      return { people, spend: people * cpp, cpp: cpp || null };
    case "spend_cpp":
      return { people: cpp > 0 ? spend / cpp : 0, spend, cpp: cpp || null };
  }
}

/** Tasa (0–1) de una línea en un escenario. null si no tiene tasa. */
export function edgeRate(f: EdgeForecast | undefined, scenario: Scenario, factors = DEFAULT_FACTORS): number | null {
  if (!f || typeof f.rate !== "number" || !Number.isFinite(f.rate)) return null;
  let pct = f.rate;
  if (scenario !== "expected") {
    const override = f[scenario];
    pct = typeof override === "number" && Number.isFinite(override) ? override : f.rate * factors[scenario].rate;
  }
  return Math.min(100, Math.max(0, pct)) / 100;
}

export function expensesTotal(expenses: ManualExpense[], days: number): number {
  return expenses.reduce((sum, e) => sum + pos(e.amount) * periodMultiplier(e.period, days), 0);
}

/**
 * Calcula la simulación del mapa.
 * - Pasos de entrada (sin líneas de simulación que lleguen): volumen × período × factor de escenario.
 * - Resto: suma de (personas del origen × tasa) de cada línea que llega.
 * - Las líneas "solo visual" no cuentan. Las líneas que cierran ciclos se ignoran y se reportan.
 */
export function computeForecast(
  steps: EngineStep[],
  edges: EngineEdge[],
  settings: Pick<ForecastSettings, "days" | "expenses" | "factors">,
  scenario: Scenario,
): ForecastResult {
  const factors = settings.factors ?? DEFAULT_FACTORS;
  const volumeFactor = scenario === "expected" ? 1 : factors[scenario].volume;
  const ids = new Set(steps.map((s) => s.id));
  const flowEdges = edges.filter((e) => !e.visual && ids.has(e.source) && ids.has(e.target) && e.source !== e.target);

  // Orden topológico (Kahn). Lo que quede sin procesar está en un ciclo.
  const incoming = new Map<string, EngineEdge[]>();
  const outgoing = new Map<string, EngineEdge[]>();
  const indeg = new Map<string, number>();
  for (const s of steps) {
    incoming.set(s.id, []);
    outgoing.set(s.id, []);
    indeg.set(s.id, 0);
  }
  for (const e of flowEdges) {
    incoming.get(e.target)!.push(e);
    outgoing.get(e.source)!.push(e);
    indeg.set(e.target, indeg.get(e.target)! + 1);
  }
  const roots = new Set(steps.filter((s) => indeg.get(s.id) === 0).map((s) => s.id));
  const queue = [...roots];
  const order: string[] = [];
  const ordered = new Set<string>();
  const left = new Map(indeg);
  const cycleEdges: string[] = [];

  const release = (id: string) => {
    for (const e of outgoing.get(id)!) {
      if (cycleEdges.includes(e.id)) continue;
      left.set(e.target, left.get(e.target)! - 1);
      if (left.get(e.target) === 0) queue.push(e.target);
    }
  };

  while (order.length < steps.length) {
    while (queue.length) {
      const id = queue.shift()!;
      if (ordered.has(id)) continue;
      order.push(id);
      ordered.add(id);
      release(id);
    }
    if (order.length === steps.length) break;
    // Ciclo: se libera el paso pendiente con menos entradas sin calcular; esas líneas no cuentan.
    const pending = steps.filter((s) => !ordered.has(s.id));
    const pick = pending.reduce((best, s) => (left.get(s.id)! < left.get(best.id)! ? s : best), pending[0]);
    for (const e of incoming.get(pick.id)!) {
      if (!ordered.has(e.source)) cycleEdges.push(e.id);
    }
    left.set(pick.id, 0);
    queue.push(pick.id);
  }
  const ignored = new Set(cycleEdges);

  const byId = new Map(steps.map((s) => [s.id, s]));
  const stepRes: Record<string, StepResult> = {};
  const edgeRes: Record<string, EdgeResult> = {};
  const edgesWithoutRate: string[] = [];
  const rootsWithoutVolume: string[] = [];
  const computed = new Set<string>();

  for (const id of order) {
    const f = byId.get(id)?.forecast;
    let people = 0;
    let cost = 0;
    let cpp: number | null = null;
    const isRoot = roots.has(id);

    if (isRoot) {
      const v = resolveVolume(f);
      const m = periodMultiplier(f?.period, settings.days) * volumeFactor;
      people = v.people * m;
      cost = v.spend * m;
      cpp = v.cpp;
      if (people === 0 && outgoing.get(id)!.length > 0) rootsWithoutVolume.push(id);
    } else {
      for (const e of incoming.get(id)!) {
        if (ignored.has(e.id) || !computed.has(e.source)) continue;
        const rate = edgeRate(e.forecast, scenario, factors);
        if (rate === null) {
          edgesWithoutRate.push(e.id);
          edgeRes[e.id] = { people: 0, rate: null };
          continue;
        }
        const flow = stepRes[e.source].people * rate;
        edgeRes[e.id] = { people: flow, rate };
        people += flow;
      }
    }

    stepRes[id] = {
      people,
      cost,
      revenue: people * pos(f?.avgValue),
      goalValue: people * pos(f?.goalValue),
      isRoot,
      costPerPerson: cpp,
    };
    computed.add(id);
  }

  // Líneas que cierran ciclos: se muestran con su tasa, pero no suman personas.
  for (const e of flowEdges) {
    if (!edgeRes[e.id]) edgeRes[e.id] = { people: 0, rate: edgeRate(e.forecast, scenario, factors) };
  }

  const all = Object.values(stepRes);
  const entering = [...roots].reduce((s, id) => s + (stepRes[id]?.people ?? 0), 0);
  const adSpend = all.reduce((s, r) => s + r.cost, 0);
  const manualExpenses = expensesTotal(settings.expenses ?? [], settings.days);
  const cost = adSpend + manualExpenses;
  const revenue = all.reduce((s, r) => s + r.revenue, 0);
  const goalValue = all.reduce((s, r) => s + r.goalValue, 0);
  const customers = steps.reduce((s, st) => s + (pos(st.forecast?.avgValue) > 0 ? stepRes[st.id]?.people ?? 0 : 0), 0);
  const profit = revenue - cost;

  return {
    scenario,
    steps: stepRes,
    edges: edgeRes,
    totals: {
      entering,
      adSpend,
      manualExpenses,
      cost,
      revenue,
      goalValue,
      profit,
      roi: cost > 0 ? profit / cost : null,
      roas: adSpend > 0 ? revenue / adSpend : null,
      customers,
      costPerCustomer: customers > 0 && cost > 0 ? cost / customers : null,
    },
    warnings: { edgesWithoutRate: [...new Set(edgesWithoutRate)], cycleEdges: [...new Set(cycleEdges)], rootsWithoutVolume },
  };
}
