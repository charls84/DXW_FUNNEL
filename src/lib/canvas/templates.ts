import { getCatalogItem } from "./catalog";
import type { CanvasDoc, DocEdge, DocNode, LineType, ProcessInfo } from "./types";
import { DEFAULT_FORECAST, type ForecastSettings, type StepForecast } from "@/lib/forecast/types";
import type { StepCrmMatch } from "@/lib/crm/types";

export type TemplateKey = "blank" | "dxw-sales-process" | "booked-call" | "lead-magnet" | "webinar";

export type TemplateMeta = { key: TemplateKey; name: string; description: string; kind: "funnel" | "process" };

export const TEMPLATES: TemplateMeta[] = [
  { key: "blank", name: "Mapa en blanco", description: "Empieza desde cero.", kind: "funnel" },
  {
    key: "dxw-sales-process",
    name: "Proceso comercial DXW",
    description: "Del primer contacto a la recompra, con responsable y SLA por etapa. Ajusta las etapas a las de tu CRM.",
    kind: "process",
  },
  {
    key: "booked-call",
    name: "Embudo de llamada de venta",
    description: "Tráfico → formulario → cita → llamada → propuesta → cierre. Para servicios que se venden en una conversación.",
    kind: "funnel",
  },
  {
    key: "lead-magnet",
    name: "Embudo de lead magnet",
    description: "Un recurso gratuito capta contactos y una secuencia de email los lleva a la oferta.",
    kind: "funnel",
  },
  {
    key: "webinar",
    name: "Embudo de webinar",
    description: "Registro, asistencia y oferta al final de la presentación.",
    kind: "funnel",
  },
];

type StepOpts = { label?: string; url?: string; process?: ProcessInfo; notes?: string; forecast?: StepForecast; crm?: StepCrmMatch };
type LinkOpts = { type?: LineType; label?: string; handles?: [string, string]; rate?: number };

class Builder {
  nodes: DocNode[] = [];
  edges: DocEdge[] = [];

  step(key: string, x: number, y: number, opts: StepOpts = {}): string {
    const item = getCatalogItem(key);
    const id = crypto.randomUUID();
    this.nodes.push({
      id,
      type: "step",
      position: { x, y },
      data: { catalogKey: key, category: item.category, label: opts.label ?? item.label, url: opts.url, process: opts.process, notes: opts.notes, forecast: opts.forecast, crm: opts.crm },
    });
    return id;
  }

  text(text: string, x: number, y: number, size: "sm" | "md" | "lg" | "xl" = "lg") {
    this.nodes.push({ id: crypto.randomUUID(), type: "text", position: { x, y }, data: { text, size } });
  }

  widget(x: number, y: number) {
    this.nodes.push({ id: crypto.randomUUID(), type: "widget", position: { x, y }, data: { kind: "forecast" } });
  }

  link(source: string, target: string, opts: LinkOpts = {}) {
    const handles = opts.handles ?? ["r", "l"];
    this.edges.push({
      id: crypto.randomUUID(),
      source,
      target,
      sourceHandle: handles[0],
      targetHandle: handles[1],
      type: "flow",
      data: { lineType: opts.type ?? "direct", label: opts.label, forecast: opts.rate === undefined ? undefined : { rate: opts.rate } },
    });
  }

  doc(extra: Partial<CanvasDoc> = {}): CanvasDoc {
    return { schema: 1, nodes: this.nodes, edges: this.edges, ...extra };
  }
}

const COL = 220;
const EXAMPLE_NOTE = "Cifras de ejemplo: reemplázalas por las tuyas en cada paso y cada línea.";

/** Volumen mensual de un paso de entrada (personas y gasto). */
const monthly = (people: number, spend = 0): StepForecast => ({ period: "month", inputs: "people_spend", people, spend });

const settings = (days = 30, expenses: ForecastSettings["expenses"] = []): ForecastSettings => ({ ...DEFAULT_FORECAST, days, expenses });

function salesProcess(): CanvasDoc {
  const b = new Builder();
  b.text("Proceso comercial DXW", 0, -170, "xl");
  b.text("Borrador: reemplaza etapas, responsables y cifras por los reales del CRM.", 0, -110, "sm");

  const referral = b.step("src-referral", 0, -20, { forecast: monthly(6), crm: { type: "lead_created", source: "Referido" } });
  const linkedin = b.step("src-linkedin", 0, 110, { forecast: monthly(10), crm: { type: "lead_created", source: "LinkedIn" } });
  const web = b.step("src-organic-search", 0, 240, { label: "Sitio web", forecast: monthly(8), crm: { type: "lead_created", source: "Sitio web" } });
  const event = b.step("src-event", 0, 370, { forecast: monthly(4), crm: { type: "lead_created", source: "Evento" } });

  const lead = b.step("crm-lead", COL, 175, { process: { owner: "Comercial", slaHours: 24, tool: "CRM DXW" }, crm: { type: "lead_created" } });
  [referral, linkedin, web, event].forEach((s) => b.link(s, lead, { rate: 100 }));

  const first = b.step("off-videocall", COL * 2, 175, { label: "Conversación inicial", process: { owner: "Comercial", slaHours: 72 }, crm: { type: "stage_changed", stage: "Conversación inicial" } });
  const diag = b.step("proc-stage", COL * 3, 175, { label: "Diagnóstico", process: { owner: "Consultor", slaHours: 120 }, crm: { type: "stage_changed", stage: "Diagnóstico" } });
  const proposal = b.step("crm-proposal", COL * 4, 175, { process: { owner: "Consultor", slaHours: 72 }, crm: { type: "stage_changed", stage: "Propuesta enviada" } });
  const nego = b.step("proc-stage", COL * 5, 175, { label: "Negociación", process: { owner: "Comercial", slaHours: 168 }, crm: { type: "stage_changed", stage: "Negociación" } });
  const decision = b.step("proc-decision", COL * 6, 175, { label: "¿Cierra?" });
  const won = b.step("crm-won", COL * 7, 60, { forecast: { avgValue: 4000 }, crm: { type: "deal_won" } });
  const lost = b.step("crm-lost", COL * 7, 300, { notes: "Registrar el motivo de pérdida.", crm: { type: "deal_lost" } });
  const onboarding = b.step("proc-stage", COL * 8, 60, { label: "Onboarding", process: { owner: "Implementación", slaHours: 120 } });
  const impl = b.step("proc-stage", COL * 9, 60, { label: "Implementación", process: { owner: "Implementación" } });
  const followUp = b.step("crm-renewal", COL * 10, 60, { label: "Seguimiento y recompra", process: { owner: "Comercial" }, forecast: { avgValue: 1500 } });

  b.link(lead, first, { rate: 60 });
  b.link(first, diag, { rate: 70 });
  b.link(diag, proposal, { rate: 80 });
  b.link(proposal, nego, { rate: 75 });
  b.link(nego, decision, { rate: 100 });
  b.link(decision, won, { label: "Sí", rate: 40 });
  b.link(decision, lost, { label: "No", rate: 60 });
  b.link(won, onboarding, { rate: 100 });
  b.link(onboarding, impl, { rate: 100 });
  b.link(impl, followUp, { type: "indirect", rate: 30 });
  b.link(lost, lead, { type: "visual", label: "Reactivar", handles: ["b", "b"] });

  b.text(EXAMPLE_NOTE, 0, 480, "sm");
  b.widget(0, 520);

  return b.doc({
    notes: "Mapa del proceso comercial de DOUX.WORK. Cada etapa tiene responsable y SLA (tiempo máximo en horas). Las cifras son de ejemplo.",
    checklist: [
      { id: crypto.randomUUID(), text: "Confirmar etapas con el pipeline del CRM", done: false },
      { id: crypto.randomUUID(), text: "Asignar responsable real a cada etapa", done: false },
      { id: crypto.randomUUID(), text: "Definir SLA por etapa", done: false },
      { id: crypto.randomUUID(), text: "Reemplazar las cifras de ejemplo por datos reales", done: false },
    ],
    forecast: settings(90, [
      { id: crypto.randomUUID(), name: "Herramientas y CRM", amount: 300, period: "month" },
      { id: crypto.randomUUID(), name: "Tiempo del equipo comercial", amount: 4000, period: "month" },
    ]),
  });
}

function bookedCall(): CanvasDoc {
  const b = new Builder();
  const ads = b.step("src-paid-social", 0, 0, { forecast: monthly(4000, 2000) });
  const li = b.step("src-linkedin", 0, 130, { forecast: monthly(600) });
  const ref = b.step("src-referral", 0, 260, { forecast: monthly(40) });
  const landing = b.step("page-landing", COL, 130);
  [ads, li, ref].forEach((s) => b.link(s, landing, { rate: 100 }));
  const form = b.step("page-form", COL * 2, 130, { label: "Formulario de aplicación" });
  const cal = b.step("page-calendar", COL * 3, 130);
  const booked = b.step("act-booking", COL * 4, 130, { forecast: { goalValue: 60 } });
  const call = b.step("off-call", COL * 5, 130, { label: "Llamada de venta" });
  const proposal = b.step("crm-proposal", COL * 6, 130);
  const won = b.step("crm-won", COL * 7, 40, { forecast: { avgValue: 2500 } });
  const lost = b.step("crm-lost", COL * 7, 220);
  b.link(landing, form, { rate: 8 });
  b.link(form, cal, { rate: 60 });
  b.link(cal, booked, { rate: 80 });
  b.link(booked, call, { type: "indirect", rate: 75 });
  b.link(call, proposal, { rate: 50 });
  b.link(proposal, won, { type: "indirect", rate: 35 });
  b.link(proposal, lost, { type: "indirect", rate: 65 });
  b.text(EXAMPLE_NOTE, 0, 390, "sm");
  b.widget(0, 430);
  return b.doc({ forecast: settings(30) });
}

function leadMagnet(): CanvasDoc {
  const b = new Builder();
  const ads = b.step("src-paid-social", 0, 0, { forecast: monthly(5000, 1500) });
  const content = b.step("src-content", 0, 140, { forecast: monthly(2000) });
  const optin = b.step("page-optin", COL, 70);
  b.link(ads, optin, { rate: 100 });
  b.link(content, optin, { rate: 100 });
  const thanks = b.step("page-download", COL * 2, 70, { label: "Gracias y descarga", forecast: { goalValue: 2 } });
  const email = b.step("src-email", COL * 3, 70, { label: "Secuencia de email" });
  const sales = b.step("page-sales", COL * 4, 70);
  const checkout = b.step("page-checkout", COL * 5, 70);
  const purchase = b.step("act-purchase", COL * 6, 70, { forecast: { avgValue: 97 } });
  b.link(optin, thanks, { rate: 30 });
  b.link(thanks, email, { type: "indirect", rate: 100 });
  b.link(email, sales, { rate: 20 });
  b.link(sales, checkout, { rate: 15 });
  b.link(checkout, purchase, { rate: 50 });
  b.text(EXAMPLE_NOTE, 0, 260, "sm");
  b.widget(0, 300);
  return b.doc({ forecast: settings(30) });
}

function webinar(): CanvasDoc {
  const b = new Builder();
  const ads = b.step("src-paid-social", 0, 0, { forecast: monthly(3000, 1800) });
  const email = b.step("src-email", 0, 140, { forecast: monthly(1500) });
  const reg = b.step("page-webinar", COL, 70, { label: "Registro al webinar" });
  b.link(ads, reg, { rate: 100 });
  b.link(email, reg, { rate: 100 });
  const signup = b.step("act-signup", COL * 2, 70, { label: "Registrado" });
  const live = b.step("page-vsl", COL * 3, 70, { label: "Webinar en vivo" });
  const offer = b.step("page-sales", COL * 4, 70, { label: "Oferta" });
  const purchase = b.step("act-purchase", COL * 5, 0, { forecast: { avgValue: 997 } });
  const call = b.step("act-booking", COL * 5, 140, { label: "Agenda una llamada", forecast: { goalValue: 150 } });
  b.link(reg, signup, { rate: 35 });
  b.link(signup, live, { type: "indirect", rate: 40 });
  b.link(live, offer, { rate: 60 });
  b.link(offer, purchase, { rate: 8 });
  b.link(offer, call, { rate: 10 });
  b.text(EXAMPLE_NOTE, 0, 270, "sm");
  b.widget(0, 310);
  return b.doc({ forecast: settings(30) });
}

export function buildTemplate(key: TemplateKey): CanvasDoc {
  switch (key) {
    case "dxw-sales-process":
      return salesProcess();
    case "booked-call":
      return bookedCall();
    case "lead-magnet":
      return leadMagnet();
    case "webinar":
      return webinar();
    default:
      return { schema: 1, nodes: [], edges: [] };
  }
}

export function isTemplateKey(v: unknown): v is TemplateKey {
  return TEMPLATES.some((t) => t.key === v);
}
