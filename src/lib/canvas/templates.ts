import { getCatalogItem } from "./catalog";
import type { CanvasDoc, DocEdge, DocNode, LineType, ProcessInfo } from "./types";

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

type StepOpts = { label?: string; url?: string; process?: ProcessInfo; notes?: string };

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
      data: { catalogKey: key, category: item.category, label: opts.label ?? item.label, url: opts.url, process: opts.process, notes: opts.notes },
    });
    return id;
  }

  text(text: string, x: number, y: number, size: "sm" | "md" | "lg" | "xl" = "lg") {
    this.nodes.push({ id: crypto.randomUUID(), type: "text", position: { x, y }, data: { text, size } });
  }

  link(source: string, target: string, lineType: LineType = "direct", label?: string, handles: [string, string] = ["r", "l"]) {
    this.edges.push({
      id: crypto.randomUUID(),
      source,
      target,
      sourceHandle: handles[0],
      targetHandle: handles[1],
      type: "flow",
      data: { lineType, label },
    });
  }

  doc(extra: Partial<CanvasDoc> = {}): CanvasDoc {
    return { schema: 1, nodes: this.nodes, edges: this.edges, ...extra };
  }
}

const COL = 220;

function salesProcess(): CanvasDoc {
  const b = new Builder();
  b.text("Proceso comercial DXW", 0, -170, "xl");
  b.text("Borrador: reemplaza las etapas y responsables por los reales del CRM.", 0, -110, "sm");

  const referral = b.step("src-referral", 0, -20);
  const linkedin = b.step("src-linkedin", 0, 110);
  const web = b.step("src-organic-search", 0, 240, { label: "Sitio web" });
  const event = b.step("src-event", 0, 370);

  const lead = b.step("crm-lead", COL, 175, { process: { owner: "Comercial", slaHours: 24, tool: "CRM DXW" } });
  [referral, linkedin, web, event].forEach((s) => b.link(s, lead));

  const first = b.step("off-videocall", COL * 2, 175, { label: "Conversación inicial", process: { owner: "Comercial", slaHours: 72 } });
  const diag = b.step("proc-stage", COL * 3, 175, { label: "Diagnóstico", process: { owner: "Consultor", slaHours: 120 } });
  const proposal = b.step("crm-proposal", COL * 4, 175, { process: { owner: "Consultor", slaHours: 72 } });
  const nego = b.step("proc-stage", COL * 5, 175, { label: "Negociación", process: { owner: "Comercial", slaHours: 168 } });
  const decision = b.step("proc-decision", COL * 6, 175, { label: "¿Cierra?" });
  const won = b.step("crm-won", COL * 7, 60);
  const lost = b.step("crm-lost", COL * 7, 300, { notes: "Registrar el motivo de pérdida." });
  const onboarding = b.step("proc-stage", COL * 8, 60, { label: "Onboarding", process: { owner: "Implementación", slaHours: 120 } });
  const impl = b.step("proc-stage", COL * 9, 60, { label: "Implementación", process: { owner: "Implementación" } });
  const followUp = b.step("crm-renewal", COL * 10, 60, { label: "Seguimiento y recompra", process: { owner: "Comercial" } });

  b.link(lead, first);
  b.link(first, diag);
  b.link(diag, proposal);
  b.link(proposal, nego);
  b.link(nego, decision);
  b.link(decision, won, "direct", "Sí");
  b.link(decision, lost, "direct", "No");
  b.link(won, onboarding);
  b.link(onboarding, impl);
  b.link(impl, followUp);
  b.link(lost, lead, "indirect", "Reactivar", ["b", "b"]);

  return b.doc({
    notes: "Mapa del proceso comercial de DOUX.WORK. Cada etapa tiene responsable y SLA (tiempo máximo en horas).",
    checklist: [
      { id: crypto.randomUUID(), text: "Confirmar etapas con el pipeline del CRM", done: false },
      { id: crypto.randomUUID(), text: "Asignar responsable real a cada etapa", done: false },
      { id: crypto.randomUUID(), text: "Definir SLA por etapa", done: false },
    ],
  });
}

function bookedCall(): CanvasDoc {
  const b = new Builder();
  const ads = b.step("src-paid-social", 0, 0);
  const li = b.step("src-linkedin", 0, 130);
  const ref = b.step("src-referral", 0, 260);
  const landing = b.step("page-landing", COL, 130);
  [ads, li, ref].forEach((s) => b.link(s, landing));
  const form = b.step("page-form", COL * 2, 130, { label: "Formulario de aplicación" });
  const cal = b.step("page-calendar", COL * 3, 130);
  const booked = b.step("act-booking", COL * 4, 130);
  const call = b.step("off-call", COL * 5, 130, { label: "Llamada de venta" });
  const proposal = b.step("crm-proposal", COL * 6, 130);
  const won = b.step("crm-won", COL * 7, 40);
  const lost = b.step("crm-lost", COL * 7, 220);
  b.link(landing, form);
  b.link(form, cal);
  b.link(cal, booked);
  b.link(booked, call, "indirect");
  b.link(call, proposal);
  b.link(proposal, won, "indirect");
  b.link(proposal, lost, "indirect");
  return b.doc();
}

function leadMagnet(): CanvasDoc {
  const b = new Builder();
  const ads = b.step("src-paid-social", 0, 0);
  const content = b.step("src-content", 0, 140);
  const optin = b.step("page-optin", COL, 70);
  b.link(ads, optin);
  b.link(content, optin);
  const thanks = b.step("page-download", COL * 2, 70, { label: "Gracias y descarga" });
  const email = b.step("src-email", COL * 3, 70, { label: "Secuencia de email" });
  const sales = b.step("page-sales", COL * 4, 70);
  const checkout = b.step("page-checkout", COL * 5, 70);
  const purchase = b.step("act-purchase", COL * 6, 70);
  b.link(optin, thanks);
  b.link(thanks, email, "indirect");
  b.link(email, sales);
  b.link(sales, checkout);
  b.link(checkout, purchase);
  return b.doc();
}

function webinar(): CanvasDoc {
  const b = new Builder();
  const ads = b.step("src-paid-social", 0, 0);
  const email = b.step("src-email", 0, 140);
  const reg = b.step("page-webinar", COL, 70, { label: "Registro al webinar" });
  b.link(ads, reg);
  b.link(email, reg);
  const signup = b.step("act-signup", COL * 2, 70, { label: "Registrado" });
  const live = b.step("page-vsl", COL * 3, 70, { label: "Webinar en vivo" });
  const offer = b.step("page-sales", COL * 4, 70, { label: "Oferta" });
  const purchase = b.step("act-purchase", COL * 5, 0);
  const call = b.step("act-booking", COL * 5, 140, { label: "Agenda una llamada" });
  b.link(reg, signup);
  b.link(signup, live, "indirect");
  b.link(live, offer);
  b.link(offer, purchase);
  b.link(offer, call);
  return b.doc();
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
