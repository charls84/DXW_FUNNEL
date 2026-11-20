/** Eventos del CRM propio de DXW y cómo se conecta un paso del mapa con ellos. */

export type CrmEventType = "lead_created" | "stage_changed" | "appointment" | "deal_won" | "deal_lost" | "payment";

export const CRM_EVENT_TYPES: CrmEventType[] = ["lead_created", "stage_changed", "appointment", "deal_won", "deal_lost", "payment"];

export const CRM_EVENT_LABELS: Record<CrmEventType, string> = {
  lead_created: "Lead creado",
  stage_changed: "Llega a una etapa",
  appointment: "Cita agendada",
  deal_won: "Deal ganado",
  deal_lost: "Deal perdido",
  payment: "Pago recibido",
};

/** Evento mínimo que usa el motor (lo que devuelve el servidor). */
export type CrmEvent = {
  type: CrmEventType;
  occurredAt: string; // ISO
  contactId: string;
  leadSource: string | null;
  pipeline: string | null;
  stage: string | null;
  value: number | null;
  owner: string | null;
};

/** Regla que conecta un paso del mapa con eventos del CRM. */
export type StepCrmMatch = {
  type: CrmEventType;
  pipeline?: string;  // vacío = cualquier pipeline
  stage?: string;     // obligatorio para stage_changed
  source?: string;    // origen del lead (solo lead_created); vacío = cualquiera
};

export type ViewMode = "forecast" | "actual" | "compare";

export const VIEW_LABELS: Record<ViewMode, string> = {
  forecast: "Simulación",
  actual: "Real",
  compare: "Comparar",
};
