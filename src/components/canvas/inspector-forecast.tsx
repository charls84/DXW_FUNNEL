"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { resolveVolume } from "@/lib/forecast/engine";
import {
  INPUT_LABELS,
  PERIOD_LABELS,
  SCENARIO_LABELS,
  type EdgeForecast,
  type ForecastSettings,
  type InputMode,
  type ManualExpense,
  type Period,
  type StepForecast,
} from "@/lib/forecast/types";
import { useForecast } from "./forecast-context";

const CURRENCIES = ["USD", "COP", "MXN", "EUR"];
const HORIZONS = [7, 30, 90, 180, 365];

/** Campo numérico que acepta vacío (undefined) y nunca guarda negativos. */
function NumberField({
  id,
  label,
  value,
  onChange,
  suffix,
  placeholder,
  disabled,
  max,
}: {
  id: string;
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  suffix?: string;
  placeholder?: string;
  disabled?: boolean;
  max?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          max={max}
          step="any"
          value={value ?? ""}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => {
            if (e.target.value === "") return onChange(undefined);
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(Math.max(0, max !== undefined ? Math.min(n, max) : n));
          }}
          className="input"
        />
        {suffix && <span className="shrink-0 text-xs text-muted">{suffix}</span>}
      </div>
    </div>
  );
}

function Result({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md bg-accent/10 px-2.5 py-1.5 text-xs text-accent">{children}</p>;
}

// ───────────────────────── Paso ─────────────────────────

export function StepForecastSection({
  nodeId,
  value,
  onChange,
  readOnly,
}: {
  nodeId: string;
  value: StepForecast | undefined;
  onChange: (f: StepForecast) => void;
  readOnly: boolean;
}) {
  const fc = useForecast();
  if (!fc) return null;
  const f = value ?? {};
  const set = (patch: Partial<StepForecast>) => onChange({ ...f, ...patch });
  const r = fc.result.steps[nodeId];
  const isRoot = r?.isRoot ?? false;
  const mode: InputMode = f.inputs ?? "people_spend";
  const resolved = resolveVolume(f);
  const cur = fc.settings.currency;

  return (
    <fieldset disabled={readOnly} className="space-y-3">
      {r && (
        <Result>
          Escenario {SCENARIO_LABELS[fc.settings.scenario].toLowerCase()}: <strong>{fc.count(r.people)} personas</strong>
          {r.cost > 0 && <> · gasto {fc.money(r.cost)}</>}
          {r.revenue > 0 && <> · ingresos {fc.money(r.revenue)}</>}
        </Result>
      )}

      {isRoot ? (
        <>
          <p className="field-help">Este paso es una entrada: aquí defines cuántas personas llegan y cuánto cuesta.</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="fc-period" className="field-label">Período</label>
              <select id="fc-period" value={f.period ?? "month"} onChange={(e) => set({ period: e.target.value as Period })} className="input">
                {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                  <option key={p} value={p}>{PERIOD_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fc-inputs" className="field-label">Datos que conoces</label>
              <select id="fc-inputs" value={mode} onChange={(e) => set({ inputs: e.target.value as InputMode })} className="input">
                {(Object.keys(INPUT_LABELS) as InputMode[]).map((m) => (
                  <option key={m} value={m}>{INPUT_LABELS[m]}</option>
                ))}
              </select>
            </div>
          </div>
          {mode !== "spend_cpp" && (
            <NumberField id="fc-people" label="Personas" value={f.people} onChange={(v) => set({ people: v })} suffix="por período" placeholder="0" />
          )}
          {mode !== "people_cpp" && (
            <NumberField id="fc-spend" label={`Gasto (${cur})`} value={f.spend} onChange={(v) => set({ spend: v })} suffix="por período" placeholder="0" />
          )}
          {mode !== "people_spend" && (
            <NumberField id="fc-cpp" label={`Costo por persona (${cur})`} value={f.costPerPerson} onChange={(v) => set({ costPerPerson: v })} placeholder="0" />
          )}
          <p className="text-xs text-muted">
            {mode === "people_spend" && `Costo por persona: ${resolved.cpp === null ? "—" : fc.money(resolved.cpp)}`}
            {mode === "people_cpp" && `Gasto por período: ${fc.money(resolved.spend)}`}
            {mode === "spend_cpp" && `Personas por período: ${fc.count(resolved.people)}`}
          </p>
        </>
      ) : (
        <p className="field-help">Las personas llegan por las líneas que entran a este paso. Define la tasa de conversión en cada línea.</p>
      )}

      <NumberField
        id="fc-value"
        label={`Ingreso por persona (${cur})`}
        value={f.avgValue}
        onChange={(v) => set({ avgValue: v })}
        placeholder="Ej.: ticket promedio"
      />
      <p className="field-help -mt-2">Úsalo en compras o deals ganados. Suma a los ingresos de la simulación.</p>
      <NumberField
        id="fc-goal"
        label={`Valor de meta por persona (${cur})`}
        value={f.goalValue}
        onChange={(v) => set({ goalValue: v })}
        placeholder="Opcional"
      />
      <p className="field-help -mt-2">Valor estimado de que alguien llegue aquí (por ejemplo, un lead). No suma a ingresos.</p>
    </fieldset>
  );
}

// ───────────────────────── Línea ─────────────────────────

export function EdgeForecastSection({
  edgeId,
  value,
  onChange,
  readOnly,
}: {
  edgeId: string;
  value: EdgeForecast | undefined;
  onChange: (f: EdgeForecast) => void;
  readOnly: boolean;
}) {
  const fc = useForecast();
  if (!fc) return null;
  const f = value ?? {};
  const set = (patch: Partial<EdgeForecast>) => onChange({ ...f, ...patch });
  const r = fc.result.edges[edgeId];
  const inCycle = fc.result.warnings.cycleEdges.includes(edgeId);
  const cons = fc.settings.factors.conservative.rate;
  const opt = fc.settings.factors.optimistic.rate;
  const auto = (factor: number) => (typeof f.rate === "number" ? `Auto: ${Math.min(100, f.rate * factor).toFixed(1)} %` : "Auto");

  return (
    <fieldset disabled={readOnly} className="space-y-3">
      {inCycle ? (
        <p className="rounded-md bg-canvas px-2.5 py-1.5 text-xs text-muted">Esta línea cierra un ciclo, así que no suma personas en la simulación.</p>
      ) : (
        r && (
          <Result>
            {r.rate === null ? "Falta la tasa de conversión." : <>Pasan <strong>{fc.count(r.people)} personas</strong> ({fc.percent(r.rate)})</>}
          </Result>
        )
      )}
      <NumberField id="fc-rate" label="Tasa de conversión esperada" value={f.rate} onChange={(v) => set({ rate: v })} suffix="%" max={100} placeholder="Ej.: 25" />
      <p className="field-help -mt-2">De cada 100 personas del paso anterior, cuántas llegan al siguiente por esta línea.</p>
      <div className="grid grid-cols-2 gap-2">
        <NumberField id="fc-rate-cons" label="Conservador" value={f.conservative} onChange={(v) => set({ conservative: v })} suffix="%" max={100} placeholder={auto(cons)} />
        <NumberField id="fc-rate-opt" label="Optimista" value={f.optimistic} onChange={(v) => set({ optimistic: v })} suffix="%" max={100} placeholder={auto(opt)} />
      </div>
      <p className="field-help -mt-2">Déjalos vacíos para usar los factores del mapa.</p>
    </fieldset>
  );
}

// ───────────────────────── Mapa ─────────────────────────

export function CanvasForecastSection({ onChange, readOnly }: { onChange: (patch: Partial<ForecastSettings>) => void; readOnly: boolean }) {
  const fc = useForecast();
  const [customDays, setCustomDays] = useState(false);
  if (!fc) return null;
  const s = fc.settings;
  const t = fc.result.totals;
  const isPreset = HORIZONS.includes(s.days) && !customDays;

  const setExpense = (id: string, patch: Partial<ManualExpense>) =>
    onChange({ expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)) });

  return (
    <fieldset disabled={readOnly} className="space-y-3">
      <Result>
        {SCENARIO_LABELS[s.scenario]}: ingresos <strong>{fc.money(t.revenue)}</strong> · gasto {fc.money(t.cost)} · utilidad{" "}
        <strong>{fc.money(t.profit)}</strong> · ROI {fc.percent(t.roi)}
      </Result>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="fc-days" className="field-label">Horizonte</label>
          <select
            id="fc-days"
            value={isPreset ? String(s.days) : "custom"}
            onChange={(e) => {
              if (e.target.value === "custom") return setCustomDays(true);
              setCustomDays(false);
              onChange({ days: Number(e.target.value) });
            }}
            className="input"
          >
            {HORIZONS.map((d) => (
              <option key={d} value={d}>{d} días</option>
            ))}
            <option value="custom">Otro…</option>
          </select>
        </div>
        <div>
          <label htmlFor="fc-currency" className="field-label">Moneda</label>
          <select id="fc-currency" value={s.currency} onChange={(e) => onChange({ currency: e.target.value })} className="input">
            {[...new Set([s.currency, ...CURRENCIES])].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      {!isPreset && (
        <NumberField
          id="fc-days-custom"
          label="Días"
          value={s.days}
          onChange={(v) => onChange({ days: Math.min(3650, Math.max(1, Math.round(v ?? 1))) })}
          max={3650}
        />
      )}

      <div>
        <p className="field-label">Escenarios</p>
        <p className="field-help mb-2">Multiplican las tasas y el volumen de entrada cuando una línea no tiene su propio valor.</p>
        <div className="grid grid-cols-2 gap-2">
          {(["conservative", "optimistic"] as const).map((sc) => (
            <div key={sc} className="space-y-2 rounded-md border border-line p-2">
              <p className="text-xs font-medium">{SCENARIO_LABELS[sc]}</p>
              <NumberField
                id={`fc-${sc}-rate`}
                label="Tasas ×"
                value={s.factors[sc].rate}
                onChange={(v) => onChange({ factors: { ...s.factors, [sc]: { ...s.factors[sc], rate: v && v > 0 ? Math.min(v, 5) : 1 } } })}
                max={5}
              />
              <NumberField
                id={`fc-${sc}-volume`}
                label="Volumen ×"
                value={s.factors[sc].volume}
                onChange={(v) => onChange({ factors: { ...s.factors, [sc]: { ...s.factors[sc], volume: v && v > 0 ? Math.min(v, 5) : 1 } } })}
                max={5}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="field-label">Gastos fijos</p>
        <p className="field-help mb-2">Costos que no dependen de un paso: software, equipo, agencia.</p>
        <ul className="space-y-2">
          {s.expenses.map((e) => (
            <li key={e.id} className="space-y-1.5 rounded-md border border-line p-2">
              <div className="flex items-center gap-1.5">
                <input
                  value={e.name}
                  onChange={(ev) => setExpense(e.id, { name: ev.target.value.slice(0, 80) })}
                  placeholder="Concepto"
                  aria-label="Concepto del gasto"
                  className="input py-1.5"
                />
                {!readOnly && (
                  <button type="button" onClick={() => onChange({ expenses: s.expenses.filter((x) => x.id !== e.id) })} aria-label={`Quitar gasto ${e.name || ""}`} className="text-muted hover:text-danger">
                    <X size={15} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={e.amount}
                  onChange={(ev) => setExpense(e.id, { amount: Math.max(0, Number(ev.target.value) || 0) })}
                  aria-label="Monto del gasto"
                  className="input py-1.5"
                />
                <select value={e.period} onChange={(ev) => setExpense(e.id, { period: ev.target.value as Period })} aria-label="Frecuencia del gasto" className="input py-1.5">
                  {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                    <option key={p} value={p}>{PERIOD_LABELS[p]}</option>
                  ))}
                </select>
              </div>
            </li>
          ))}
        </ul>
        {!readOnly && s.expenses.length < 50 && (
          <button
            type="button"
            onClick={() => onChange({ expenses: [...s.expenses, { id: crypto.randomUUID(), name: "", amount: 0, period: "month" }] })}
            className="btn-secondary mt-2 w-full py-1.5 text-xs"
          >
            Agregar gasto
          </button>
        )}
      </div>
    </fieldset>
  );
}
