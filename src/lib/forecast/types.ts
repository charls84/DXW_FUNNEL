/** Simulación (forecast): datos que se guardan dentro del documento del mapa. */

export type Period = "day" | "week" | "month" | "fixed";
export type InputMode = "people_spend" | "people_cpp" | "spend_cpp";
export type Scenario = "conservative" | "expected" | "optimistic";

/** Entradas de un paso. El volumen solo se usa en pasos de entrada (sin líneas que lleguen). */
export type StepForecast = {
  period?: Period;
  inputs?: InputMode;
  people?: number;          // personas por período
  spend?: number;           // gasto por período
  costPerPerson?: number;   // costo por persona
  avgValue?: number;        // ingreso por persona que llega a este paso (compra, deal ganado)
  goalValue?: number;       // valor estimado por persona (meta). No suma a ingresos.
};

/** Tasa de conversión de una línea, en %. Las de escenario son opcionales. */
export type EdgeForecast = {
  rate?: number;
  conservative?: number;
  optimistic?: number;
};

export type ManualExpense = { id: string; name: string; amount: number; period: Period };

export type ScenarioFactors = { rate: number; volume: number };

export type ForecastSettings = {
  days: number;                       // horizonte de la simulación
  scenario: Scenario;                 // escenario que se muestra en el mapa
  currency: string;                   // ISO 4217
  showLayer: boolean;                 // mostrar números sobre el mapa
  expenses: ManualExpense[];
  factors: Record<Exclude<Scenario, "expected">, ScenarioFactors>;
};

export const DEFAULT_FACTORS: ForecastSettings["factors"] = {
  conservative: { rate: 0.8, volume: 0.9 },
  optimistic: { rate: 1.2, volume: 1.1 },
};

export const DEFAULT_FORECAST: ForecastSettings = {
  days: 30,
  scenario: "expected",
  currency: "USD",
  showLayer: true,
  expenses: [],
  factors: DEFAULT_FACTORS,
};

export const PERIOD_LABELS: Record<Period, string> = {
  day: "Por día",
  week: "Por semana",
  month: "Por mes (30 días)",
  fixed: "Total del período",
};

export const INPUT_LABELS: Record<InputMode, string> = {
  people_spend: "Personas y gasto",
  people_cpp: "Personas y costo por persona",
  spend_cpp: "Gasto y costo por persona",
};

export const SCENARIO_LABELS: Record<Scenario, string> = {
  conservative: "Conservador",
  expected: "Esperado",
  optimistic: "Optimista",
};
