"use client";

import { useActionState } from "react";
import type { FormState } from "./actions";

type Values = { name: string; type: "internal" | "client"; main_url: string; timezone: string; currency: string };

type Props = {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  submitLabel: string;
  pendingLabel: string;
  timezones: string[];
  currencies: readonly string[];
  initial?: Partial<Values>;
  disabled?: boolean;
};

export function WorkspaceForm({ action, submitLabel, pendingLabel, timezones, currencies, initial, disabled }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const v: Values = {
    name: "",
    type: "client",
    main_url: "",
    timezone: "America/Bogota",
    currency: "USD",
    ...initial,
  };

  return (
    <form action={formAction} className="space-y-5">
      <fieldset disabled={disabled || pending} className="space-y-5">
        <div>
          <label htmlFor="name" className="field-label">Nombre</label>
          <input id="name" name="name" required maxLength={80} defaultValue={v.name} className="input" placeholder="Ej.: Proceso comercial DXW" />
        </div>

        <div>
          <span className="field-label">Tipo</span>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="type" value="internal" defaultChecked={v.type === "internal"} /> Interno DXW
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="type" value="client" defaultChecked={v.type === "client"} /> Cliente
            </label>
          </div>
          <p className="field-help">Interno: procesos de DOUX.WORK. Cliente: embudos que armamos para un cliente.</p>
        </div>

        <div>
          <label htmlFor="main_url" className="field-label">Sitio web principal (opcional)</label>
          <input id="main_url" name="main_url" defaultValue={v.main_url} className="input" placeholder="cliente.com" />
          <p className="field-help">Se usará para el tracking web en una fase posterior.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="timezone" className="field-label">Zona horaria</label>
            <select id="timezone" name="timezone" defaultValue={v.timezone} className="input">
              {timezones.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="currency" className="field-label">Moneda</label>
            <select id="currency" name="currency" defaultValue={v.currency} className="input">
              {currencies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <p className="field-help">Se usa en las simulaciones de costos e ingresos.</p>
          </div>
        </div>
      </fieldset>

      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p role="status" className="text-sm text-success">{state.success}</p>}

      <button type="submit" className="btn-primary" disabled={disabled || pending}>
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
