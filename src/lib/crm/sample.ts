import type { CrmEvent } from "./types";

/**
 * Eventos de ejemplo del proceso comercial (para la vista de prueba y los tests).
 * Generador determinista: mismos datos en cada carga. No son datos reales.
 */
export function sampleSalesEvents(days = 90, now = new Date()): CrmEvent[] {
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const sources = ["Referido", "LinkedIn", "Sitio web", "Evento"];
  const weights = [0.2, 0.36, 0.3, 0.14];
  const stages: [string, number, number][] = [
    // etapa, probabilidad de llegar desde la anterior, días promedio de espera
    ["Conversación inicial", 0.55, 2],
    ["Diagnóstico", 0.72, 4],
    ["Propuesta enviada", 0.78, 5],
    ["Negociación", 0.7, 6],
  ];
  const events: CrmEvent[] = [];
  const start = now.getTime() - days * 86_400_000;
  const leads = Math.round(days * 0.85);
  const ev = (contactId: string, t: number, partial: Partial<CrmEvent> & Pick<CrmEvent, "type">): CrmEvent => ({
    contactId,
    occurredAt: new Date(t).toISOString(),
    leadSource: null,
    pipeline: "Ventas",
    stage: null,
    value: null,
    owner: null,
    ...partial,
  });

  for (let i = 0; i < leads; i++) {
    const id = `c_${i + 1}`;
    let t = start + rand() * (days - 5) * 86_400_000;
    let r = rand();
    let source = sources[0];
    for (let k = 0; k < sources.length; k++) {
      if (r < weights[k]) {
        source = sources[k];
        break;
      }
      r -= weights[k];
    }
    events.push(ev(id, t, { type: "lead_created", leadSource: source, owner: "Comercial" }));
    let alive = true;
    for (const [stage, p, wait] of stages) {
      if (!alive) break;
      if (rand() > p) {
        alive = false;
        break;
      }
      t += (wait * (0.5 + rand())) * 86_400_000;
      if (t > now.getTime()) {
        alive = false;
        break;
      }
      events.push(ev(id, t, { type: "stage_changed", stage }));
    }
    if (!alive) continue;
    t += 3 * (0.5 + rand()) * 86_400_000;
    if (t > now.getTime()) continue;
    if (rand() < 0.38) events.push(ev(id, t, { type: "deal_won", value: 3000 + Math.round(rand() * 2500), stage: "Ganado" }));
    else events.push(ev(id, t, { type: "deal_lost", stage: "Perdido" }));
  }
  return events;
}
