import type { CrmEvent, StepCrmMatch } from "./types";

export type ActualStep = { id: string; crm?: StepCrmMatch; slaHours?: number | null };
export type ActualEdge = { id: string; source: string; target: string; visual?: boolean };

export type StepContact = { id: string; at: string; owner: string | null; source: string | null; value: number | null };
export type EdgeContact = { id: string; fromAt: string; toAt: string; days: number };

export type StepActual = {
  people: number;            // contactos distintos que llegaron al paso en el período
  revenue: number;           // suma de valores (deals ganados y pagos)
  avgHoursInStep: number | null; // tiempo promedio hasta el siguiente paso conectado
  overSla: number;           // contactos que pasaron (o siguen) más tiempo que el SLA
  waiting: number;           // contactos que siguen en el paso (sin pasar a uno siguiente)
  contacts: StepContact[];   // quiénes llegaron (más recientes primero)
};

export type EdgeActual = {
  people: number;            // contactos que llegaron a A y después a B
  rate: number | null;       // people / personas en A
  medianDays: number | null; // tiempo mediano entre A y B
  contacts: EdgeContact[];   // quiénes pasaron (más recientes primero)
};

/** Lo que hay en el CRM, con cuántos contactos distintos: para mapear pasos desde datos reales. */
export type ExplorerEntry = { match: StepCrmMatch; label: string; count: number };
export type ExplorerCatalog = { sources: ExplorerEntry[]; stages: ExplorerEntry[]; events: ExplorerEntry[]; contacts: number };

export type ActualsResult = {
  from: string;
  to: string;
  steps: Record<string, StepActual>;
  edges: Record<string, EdgeActual>;
  totals: { revenue: number; sales: number; contacts: number; mappedSteps: number };
  catalog: { pipelines: string[]; stages: Record<string, string[]>; sources: string[] };
};

const HOUR = 3_600_000;

export function matches(e: CrmEvent, m: StepCrmMatch): boolean {
  if (e.type !== m.type) return false;
  if (m.pipeline && e.pipeline !== m.pipeline) return false;
  if (m.type === "stage_changed") {
    if (!m.stage || e.stage !== m.stage) return false;
  }
  if (m.type === "lead_created" && m.source && e.leadSource !== m.source) return false;
  return true;
}

/** Pipelines, etapas y orígenes vistos en los eventos, para los selectores del panel. */
export function crmCatalog(events: CrmEvent[]): ActualsResult["catalog"] {
  const pipelines = new Set<string>();
  const stages = new Map<string, Set<string>>();
  const sources = new Set<string>();
  for (const e of events) {
    if (e.leadSource) sources.add(e.leadSource);
    const p = e.pipeline ?? "";
    if (e.pipeline) pipelines.add(e.pipeline);
    if (e.stage) {
      if (!stages.has(p)) stages.set(p, new Set());
      stages.get(p)!.add(e.stage);
    }
  }
  const sort = (s: Iterable<string>) => [...s].sort((a, b) => a.localeCompare(b, "es"));
  return {
    pipelines: sort(pipelines),
    stages: Object.fromEntries([...stages].map(([k, v]) => [k, sort(v)])),
    sources: sort(sources),
  };
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Calcula los datos reales del mapa a partir de los eventos del CRM en [from, to].
 * - Paso conectado: contactos distintos con un evento que cumple su regla (se usa la primera vez en el período).
 * - Línea A→B: contactos que llegaron a A y luego a B (B en o después de A). Tasa = esos / contactos en A.
 * - Tiempo en el paso: hasta el primer paso siguiente conectado; los que no avanzan se cuentan como "en espera".
 */
export function computeActuals(
  steps: ActualStep[],
  edges: ActualEdge[],
  events: CrmEvent[],
  range: { from: Date; to: Date },
  now = new Date(),
): ActualsResult {
  const fromMs = range.from.getTime();
  const toMs = range.to.getTime();
  const inRange = events.filter((e) => {
    const t = Date.parse(e.occurredAt);
    return Number.isFinite(t) && t >= fromMs && t <= toMs;
  });

  // Primera vez que cada contacto llega a cada paso conectado.
  const firstAt = new Map<string, Map<string, number>>();
  const stepRes: Record<string, StepActual> = {};
  const mapped = steps.filter((s) => s.crm);
  for (const s of mapped) {
    const times = new Map<string, number>();
    const info = new Map<string, StepContact>();
    let revenue = 0;
    for (const e of inRange) {
      if (!matches(e, s.crm!)) continue;
      const t = Date.parse(e.occurredAt);
      const prev = times.get(e.contactId);
      if (prev === undefined || t < prev) {
        times.set(e.contactId, t);
        info.set(e.contactId, { id: e.contactId, at: e.occurredAt, owner: e.owner, source: e.leadSource, value: e.value });
      }
      if ((e.type === "deal_won" || e.type === "payment") && e.value) revenue += e.value;
    }
    firstAt.set(s.id, times);
    const contacts = [...info.values()].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    stepRes[s.id] = { people: times.size, revenue, avgHoursInStep: null, overSla: 0, waiting: 0, contacts };
  }

  const flow = edges.filter((e) => !e.visual && firstAt.has(e.source) && firstAt.has(e.target) && e.source !== e.target);
  const edgeRes: Record<string, EdgeActual> = {};
  for (const e of flow) {
    const a = firstAt.get(e.source)!;
    const b = firstAt.get(e.target)!;
    const days: number[] = [];
    const contacts: EdgeContact[] = [];
    for (const [contact, ta] of a) {
      const tb = b.get(contact);
      if (tb !== undefined && tb >= ta) {
        const d = (tb - ta) / (24 * HOUR);
        days.push(d);
        contacts.push({ id: contact, fromAt: new Date(ta).toISOString(), toAt: new Date(tb).toISOString(), days: d });
      }
    }
    contacts.sort((x, y) => Date.parse(y.toAt) - Date.parse(x.toAt));
    edgeRes[e.id] = { people: days.length, rate: a.size ? days.length / a.size : null, medianDays: median(days), contacts };
  }

  // Tiempo en cada paso hasta el siguiente paso conectado, y SLA.
  const outgoing = new Map<string, string[]>();
  for (const e of flow) outgoing.set(e.source, [...(outgoing.get(e.source) ?? []), e.target]);
  for (const s of mapped) {
    const times = firstAt.get(s.id)!;
    const nexts = (outgoing.get(s.id) ?? []).map((id) => firstAt.get(id)!);
    if (!nexts.length) continue;
    const sla = s.slaHours && s.slaHours > 0 ? s.slaHours * HOUR : null;
    const spent: number[] = [];
    let waiting = 0;
    let overSla = 0;
    for (const [contact, ta] of times) {
      const next = nexts.map((m) => m.get(contact)).filter((t): t is number => t !== undefined && t >= ta);
      if (next.length) {
        const dt = Math.min(...next) - ta;
        spent.push(dt);
        if (sla !== null && dt > sla) overSla++;
      } else {
        waiting++;
        if (sla !== null && now.getTime() - ta > sla) overSla++;
      }
    }
    stepRes[s.id].avgHoursInStep = spent.length ? spent.reduce((x, y) => x + y, 0) / spent.length / HOUR : null;
    stepRes[s.id].waiting = waiting;
    stepRes[s.id].overSla = overSla;
  }

  const salesContacts = new Set(inRange.filter((e) => e.type === "deal_won").map((e) => e.contactId));
  // Igual que en la simulación: los ingresos son los de los pasos que están en el mapa (evita contar dos veces deal y pago).
  const revenue = Object.values(stepRes).reduce((s, r) => s + r.revenue, 0);

  return {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    steps: stepRes,
    edges: edgeRes,
    totals: { revenue, sales: salesContacts.size, contacts: new Set(inRange.map((e) => e.contactId)).size, mappedSteps: mapped.length },
    catalog: crmCatalog(events),
  };
}

/** Catálogo del CRM con conteo de contactos distintos por origen, etapa y tipo de evento. */
export function crmExplorer(events: CrmEvent[]): ExplorerCatalog {
  const sources = new Map<string, Set<string>>();
  const stages = new Map<string, Set<string>>();
  const types = new Map<string, Set<string>>();
  const all = new Set<string>();
  const add = (m: Map<string, Set<string>>, key: string, contact: string) => {
    if (!m.has(key)) m.set(key, new Set());
    m.get(key)!.add(contact);
  };
  for (const e of events) {
    all.add(e.contactId);
    if (e.type === "lead_created") add(sources, e.leadSource ?? "", e.contactId);
    else if (e.type === "stage_changed" && e.stage) add(stages, `${e.pipeline ?? ""} ${e.stage}`, e.contactId);
    else add(types, e.type, e.contactId);
  }
  const byCount = (a: ExplorerEntry, b: ExplorerEntry) => b.count - a.count || a.label.localeCompare(b.label, "es");
  const TYPE_LABEL: Record<string, string> = { appointment: "Cita agendada", deal_won: "Deal ganado", deal_lost: "Deal perdido", payment: "Pago recibido" };
  return {
    contacts: all.size,
    sources: [...sources].map(([src, set]): ExplorerEntry => ({ match: { type: "lead_created", source: src || undefined }, label: src || "Sin origen", count: set.size })).sort(byCount),
    stages: [...stages]
      .map(([key, set]) => {
        const [pipeline, stage] = key.split(" ");
        return { match: { type: "stage_changed" as const, stage, pipeline: pipeline || undefined }, label: pipeline ? `${stage} · ${pipeline}` : stage, count: set.size };
      })
      .sort(byCount),
    events: [...types].map(([t, set]) => ({ match: { type: t as CrmEvent["type"] }, label: TYPE_LABEL[t] ?? t, count: set.size })).sort(byCount),
  };
}
