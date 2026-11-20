import type { CanvasDoc, ChecklistItem, DocEdge, DocNode, LineType, NodeCategory } from "./types";
import { DEFAULT_FORECAST, type EdgeForecast, type ForecastSettings, type InputMode, type Period, type Scenario, type StepForecast } from "@/lib/forecast/types";

const CATEGORIES: NodeCategory[] = ["source", "page", "action", "offline", "process", "crm"];
const LINE_TYPES: LineType[] = ["direct", "indirect", "visual"];
const MAX_NODES = 1000;
const MAX_EDGES = 2000;
const MAX_TEXT = 5000;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const str = (v: unknown, max = 500) => (typeof v === "string" ? v.slice(0, max) : "");
const optStr = (v: unknown, max = 500) => (typeof v === "string" && v.length ? v.slice(0, max) : undefined);

/** Solo imágenes https (Storage). En desarrollo se permiten data URLs pequeñas para la vista de prueba. */
export function safeImageUrl(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  if (/^https:\/\/[^\s"'<>]+$/i.test(v) && v.length <= 1000) return v;
  if (process.env.NODE_ENV !== "production" && /^data:image\/(png|jpeg|webp|gif);base64,/i.test(v) && v.length <= 400_000) return v;
  return undefined;
}

function checklist(v: unknown): ChecklistItem[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v
    .filter(isObj)
    .slice(0, 200)
    .map((i) => ({ id: str(i.id, 64) || crypto.randomUUID(), text: str(i.text, 300), done: i.done === true }));
}

// ── Simulación ──
const PERIODS: Period[] = ["day", "week", "month", "fixed"];
const INPUTS: InputMode[] = ["people_spend", "people_cpp", "spend_cpp"];
const SCENARIOS: Scenario[] = ["conservative", "expected", "optimistic"];
const MAX_AMOUNT = 1e12;

/** Número ≥ 0 y finito, o undefined. */
const amount = (v: unknown, max = MAX_AMOUNT) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.min(v, max) : undefined);
const pct = (v: unknown) => amount(v, 100);

function stepForecast(v: unknown): StepForecast | undefined {
  if (!isObj(v)) return undefined;
  const f: StepForecast = {
    period: PERIODS.includes(v.period as Period) ? (v.period as Period) : undefined,
    inputs: INPUTS.includes(v.inputs as InputMode) ? (v.inputs as InputMode) : undefined,
    people: amount(v.people),
    spend: amount(v.spend),
    costPerPerson: amount(v.costPerPerson),
    avgValue: amount(v.avgValue),
    goalValue: amount(v.goalValue),
  };
  return Object.values(f).some((x) => x !== undefined) ? f : undefined;
}

function edgeForecast(v: unknown): EdgeForecast | undefined {
  if (!isObj(v)) return undefined;
  const f: EdgeForecast = { rate: pct(v.rate), conservative: pct(v.conservative), optimistic: pct(v.optimistic) };
  return Object.values(f).some((x) => x !== undefined) ? f : undefined;
}

function factor(v: unknown, fallback: number) {
  return typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 5 ? v : fallback;
}

export function forecastSettings(v: unknown): ForecastSettings | undefined {
  if (!isObj(v)) return undefined;
  const f = isObj(v.factors) ? v.factors : {};
  const cons = isObj(f.conservative) ? f.conservative : {};
  const opt = isObj(f.optimistic) ? f.optimistic : {};
  return {
    days: Math.round(Math.min(3650, Math.max(1, num(v.days, DEFAULT_FORECAST.days)))),
    scenario: SCENARIOS.includes(v.scenario as Scenario) ? (v.scenario as Scenario) : "expected",
    currency: /^[A-Z]{3}$/.test(str(v.currency)) ? str(v.currency) : DEFAULT_FORECAST.currency,
    showLayer: v.showLayer !== false,
    expenses: (Array.isArray(v.expenses) ? v.expenses : [])
      .filter(isObj)
      .slice(0, 50)
      .map((e) => ({
        id: str(e.id, 64) || crypto.randomUUID(),
        name: str(e.name, 80),
        amount: amount(e.amount) ?? 0,
        period: PERIODS.includes(e.period as Period) ? (e.period as Period) : "month",
      })),
    factors: {
      conservative: { rate: factor(cons.rate, DEFAULT_FORECAST.factors.conservative.rate), volume: factor(cons.volume, DEFAULT_FORECAST.factors.conservative.volume) },
      optimistic: { rate: factor(opt.rate, DEFAULT_FORECAST.factors.optimistic.rate), volume: factor(opt.volume, DEFAULT_FORECAST.factors.optimistic.volume) },
    },
  };
}

function node(v: unknown): DocNode | null {
  if (!isObj(v) || typeof v.id !== "string" || !isObj(v.data)) return null;
  const position = isObj(v.position) ? { x: num(v.position.x), y: num(v.position.y) } : { x: 0, y: 0 };
  const d = v.data;
  const id = v.id.slice(0, 64);

  if (v.type === "step") {
    const category = CATEGORIES.includes(d.category as NodeCategory) ? (d.category as NodeCategory) : "page";
    const process = isObj(d.process)
      ? {
          owner: optStr(d.process.owner, 120),
          slaHours: typeof d.process.slaHours === "number" && d.process.slaHours >= 0 ? d.process.slaHours : null,
          tool: optStr(d.process.tool, 120),
        }
      : undefined;
    return {
      id,
      type: "step",
      position,
      data: {
        catalogKey: str(d.catalogKey, 64) || "generic",
        category,
        label: str(d.label, 120),
        url: optStr(d.url, 500),
        iconUrl: safeImageUrl(d.iconUrl),
        thumbnailUrl: safeImageUrl(d.thumbnailUrl),
        notes: optStr(d.notes, MAX_TEXT),
        checklist: checklist(d.checklist),
        process,
        forecast: stepForecast(d.forecast),
      },
    };
  }
  if (v.type === "widget") {
    return { id, type: "widget", position, data: { kind: "forecast" } };
  }
  if (v.type === "text") {
    const size = ["sm", "md", "lg", "xl"].includes(d.size as string) ? (d.size as "sm" | "md" | "lg" | "xl") : "md";
    return { id, type: "text", position, data: { text: str(d.text, 1000), size } };
  }
  if (v.type === "shape") {
    return {
      id,
      type: "shape",
      position,
      width: num(v.width, 240),
      height: num(v.height, 160),
      data: {
        shape: d.shape === "ellipse" ? "ellipse" : "rect",
        label: optStr(d.label, 120),
        color: /^#[0-9a-f]{6}$/i.test(str(d.color)) ? str(d.color) : "#1d5bd6",
      },
    };
  }
  if (v.type === "image") {
    const url = safeImageUrl(d.url);
    if (!url) return null;
    return { id, type: "image", position, width: num(v.width, 240), height: num(v.height, 160), data: { url, alt: optStr(d.alt, 200) } };
  }
  return null;
}

function edge(v: unknown, nodeIds: Set<string>): DocEdge | null {
  if (!isObj(v) || typeof v.id !== "string") return null;
  const source = str(v.source, 64);
  const target = str(v.target, 64);
  if (!nodeIds.has(source) || !nodeIds.has(target)) return null;
  const d = isObj(v.data) ? v.data : {};
  return {
    id: v.id.slice(0, 64),
    source,
    target,
    sourceHandle: typeof v.sourceHandle === "string" ? v.sourceHandle.slice(0, 32) : null,
    targetHandle: typeof v.targetHandle === "string" ? v.targetHandle.slice(0, 32) : null,
    type: "flow",
    data: {
      lineType: LINE_TYPES.includes(d.lineType as LineType) ? (d.lineType as LineType) : "direct",
      label: optStr(d.label, 80),
      forecast: edgeForecast(d.forecast),
    },
  };
}

/** Limpia y valida un documento recibido del cliente o de la base de datos. Nunca lanza. */
export function sanitizeDoc(input: unknown): CanvasDoc {
  const src = isObj(input) ? input : {};
  const nodes = (Array.isArray(src.nodes) ? src.nodes : []).slice(0, MAX_NODES).map(node).filter((n): n is DocNode => !!n);
  const ids = new Set(nodes.map((n) => n.id));
  const edges = (Array.isArray(src.edges) ? src.edges : []).slice(0, MAX_EDGES).map((e) => edge(e, ids)).filter((e): e is DocEdge => !!e);
  const vp = isObj(src.viewport) ? { x: num(src.viewport.x), y: num(src.viewport.y), zoom: num(src.viewport.zoom, 1) } : undefined;

  return {
    schema: 1,
    nodes,
    edges,
    notes: optStr(src.notes, MAX_TEXT),
    checklist: checklist(src.checklist),
    viewport: vp,
    forecast: forecastSettings(src.forecast),
  };
}
