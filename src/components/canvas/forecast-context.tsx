"use client";

import { createContext, useContext } from "react";
import type { ForecastResult } from "@/lib/forecast/engine";
import type { ForecastSettings, Scenario } from "@/lib/forecast/types";
import type { ActualsResult, ExplorerCatalog } from "@/lib/crm/actuals";

export type CrmState = { available: boolean; loading: boolean; error: string | null };

export type ForecastView = {
  settings: ForecastSettings;
  /** Datos reales del CRM en los últimos `settings.days` días (null si no hay CRM o no cargó). */
  actual: ActualsResult | null;
  /** Mismo cálculo para el período anterior (los N días previos), para comparar tendencias. */
  previous: ActualsResult | null;
  /** Orígenes, etapas y eventos que existen en el CRM, con conteos. */
  explorer: ExplorerCatalog | null;
  crm: CrmState;
  /** Resultado del escenario seleccionado. */
  result: ForecastResult;
  /** Los tres escenarios, para el resumen comparativo. */
  byScenario: Record<Scenario, ForecastResult>;
  money: (n: number) => string;
  count: (n: number) => string;
  percent: (n: number | null) => string;
};

export const ForecastContext = createContext<ForecastView | null>(null);

export function useForecast() {
  return useContext(ForecastContext);
}

/** Diferencia relativa real vs simulación. null si la simulación es 0. */
export function delta(real: number, sim: number): number | null {
  if (!(sim > 0)) return null;
  return (real - sim) / sim;
}

/** Verde si va igual o mejor (±10 %), rojo si está más de 10 % por debajo. */
export function deltaTone(d: number | null): "good" | "bad" | "neutral" {
  if (d === null) return "neutral";
  return d < -0.1 ? "bad" : "good";
}

export function makeFormatters(currency: string) {
  let moneyFmt: Intl.NumberFormat;
  try {
    moneyFmt = new Intl.NumberFormat("es-CO", { style: "currency", currency, maximumFractionDigits: 0 });
  } catch {
    moneyFmt = new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }
  const countFmt = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
  const smallFmt = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
  return {
    money: (n: number) => moneyFmt.format(Math.round(n)),
    // Menos de 10 personas se muestran con un decimal para no esconder conversiones pequeñas.
    count: (n: number) => (n > 0 && n < 10 ? smallFmt.format(n) : countFmt.format(Math.round(n))),
    percent: (n: number | null) => (n === null ? "—" : `${smallFmt.format(n * 100)} %`),
  };
}
