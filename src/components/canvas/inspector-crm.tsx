"use client";

import { CRM_EVENT_LABELS, CRM_EVENT_TYPES, type CrmEventType, type StepCrmMatch } from "@/lib/crm/types";
import { useForecast } from "./forecast-context";

/** Conecta un paso con eventos del CRM y muestra sus datos reales. */
export function StepCrmSection({
  nodeId,
  value,
  onChange,
  readOnly,
  onShowPeople,
}: {
  nodeId: string;
  value: StepCrmMatch | undefined;
  onChange: (v: StepCrmMatch | undefined) => void;
  readOnly: boolean;
  onShowPeople?: () => void;
}) {
  const fc = useForecast();
  if (!fc?.crm.available) return null;
  const catalog = fc.actual?.catalog;
  const real = fc.actual?.steps[nodeId];
  const set = (patch: Partial<StepCrmMatch>) => onChange({ ...(value ?? { type: "stage_changed" }), ...patch });
  const stagesFor = catalog ? [...new Set(value?.pipeline ? catalog.stages[value.pipeline] ?? [] : Object.values(catalog.stages).flat())] : [];
  const hours = (h: number) => (h >= 48 ? `${(h / 24).toLocaleString("es-CO", { maximumFractionDigits: 1 })} días` : `${Math.round(h)} horas`);

  return (
    <fieldset disabled={readOnly} className="space-y-3">
      <div>
        <label htmlFor="crm-type" className="field-label">Evento del CRM que representa este paso</label>
        <select
          id="crm-type"
          value={value?.type ?? ""}
          onChange={(e) => (e.target.value ? set({ type: e.target.value as CrmEventType }) : onChange(undefined))}
          className="input"
        >
          <option value="">Sin conexión al CRM</option>
          {CRM_EVENT_TYPES.map((t) => (
            <option key={t} value={t}>{CRM_EVENT_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {value && (
        <>
          <div>
            <label htmlFor="crm-pipeline" className="field-label">Pipeline (opcional)</label>
            <input
              id="crm-pipeline"
              list="crm-pipelines"
              value={value.pipeline ?? ""}
              onChange={(e) => set({ pipeline: e.target.value.slice(0, 120) || undefined })}
              placeholder="Cualquiera"
              className="input"
            />
            <datalist id="crm-pipelines">
              {catalog?.pipelines.map((p) => <option key={p} value={p} />)}
            </datalist>
          </div>
          {value.type === "stage_changed" && (
            <div>
              <label htmlFor="crm-stage" className="field-label">Etapa</label>
              <input
                id="crm-stage"
                list="crm-stages"
                value={value.stage ?? ""}
                onChange={(e) => set({ stage: e.target.value.slice(0, 120) || undefined })}
                placeholder="Nombre exacto de la etapa en el CRM"
                className="input"
              />
              <datalist id="crm-stages">
                {stagesFor.map((s) => <option key={s} value={s} />)}
              </datalist>
              {!value.stage && <p className="mt-1 text-xs text-danger">Elige la etapa para medir este paso.</p>}
            </div>
          )}
          {value.type === "lead_created" && (
            <div>
              <label htmlFor="crm-source" className="field-label">Origen del lead (opcional)</label>
              <input
                id="crm-source"
                list="crm-sources"
                value={value.source ?? ""}
                onChange={(e) => set({ source: e.target.value.slice(0, 120) || undefined })}
                placeholder="Cualquiera"
                className="input"
              />
              <datalist id="crm-sources">
                {catalog?.sources.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
          )}
          <p className="field-help">Las etapas y orígenes que ya llegaron del CRM aparecen como sugerencias al escribir.</p>
        </>
      )}

      {value &&
        (fc.crm.loading ? (
          <p className="text-xs text-muted">Cargando datos del CRM…</p>
        ) : real ? (
          <div className="rounded-md bg-success/10 px-2.5 py-1.5 text-xs text-success">
            <p>
              Últimos {fc.settings.days} días: <strong>{fc.count(real.people)} contactos</strong>
              {real.revenue > 0 && <> · ingresos {fc.money(real.revenue)}</>}
            </p>
            {real.avgHoursInStep !== null && <p>Tiempo promedio en el paso: {hours(real.avgHoursInStep)}</p>}
            {real.waiting > 0 && <p>{fc.count(real.waiting)} siguen en este paso</p>}
            {real.overSla > 0 && <p className="text-danger">{fc.count(real.overSla)} superaron el SLA</p>}
            {onShowPeople && real.people > 0 && (
              <button type="button" onClick={onShowPeople} className="mt-1 font-medium underline-offset-2 hover:underline">
                Ver quiénes son ({fc.count(real.people)})
              </button>
            )}
          </div>
        ) : null)}
    </fieldset>
  );
}
