"use client";

import { createContext, useContext } from "react";
import type { ForecastResult } from "@/lib/forecast/engine";
import type { ForecastSettings, Scenario } from "@/lib/forecast/types";

export type ForecastView = {
  settings: ForecastSettings;
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
