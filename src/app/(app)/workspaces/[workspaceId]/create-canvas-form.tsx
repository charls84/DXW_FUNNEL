"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/canvas-actions";
import type { TemplateKey, TemplateMeta } from "@/lib/canvas/templates";
import { CANVAS_MODE_HELP, CANVAS_MODE_LABELS, type CanvasMode } from "@/lib/canvas/types";

type DxwTemplate = { id: string; name: string; kind: "funnel" | "process"; workspaceName: string; nodeCount: number };

type Option = { value: string; name: string; description: string };

export function CreateCanvasForm({
  action,
  templates,
  dxwTemplates,
  defaultTemplate,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  templates: TemplateMeta[];
  dxwTemplates: DxwTemplate[];
  defaultTemplate: TemplateKey;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const base: Option[] = templates.map((t) => ({ value: t.key, name: t.name, description: t.description }));
  const own: Option[] = dxwTemplates.map((t) => ({
    value: `canvas:${t.id}`,
    name: t.name,
    description: `${t.kind === "process" ? "Proceso" : "Embudo"} · ${t.nodeCount} elementos${t.workspaceName ? ` · de ${t.workspaceName}` : ""}`,
  }));
  const all = [...own, ...base];

  const [selected, setSelected] = useState<string>(defaultTemplate);
  const nameFor = (value: string) => {
    const o = all.find((x) => x.value === value);
    return !o || value === "blank" ? "" : o.name;
  };
  const [name, setName] = useState(nameFor(defaultTemplate));
  const [mode, setMode] = useState<CanvasMode>("complete");

  function choose(value: string) {
    if (!name || name === nameFor(selected)) setName(nameFor(value));
    setSelected(value);
  }

  const renderGroup = (title: string, options: Option[]) =>
    options.length > 0 && (
      <div>
        <span className="mb-1.5 block text-xs font-semibold text-muted">{title}</span>
        <div className="space-y-2">
          {options.map((t) => (
            <label
              key={t.value}
              className={`flex cursor-pointer gap-3 rounded-md border p-3 text-sm ${selected === t.value ? "border-accent bg-accent/5" : "border-line hover:bg-canvas"}`}
            >
              <input type="radio" name="template" value={t.value} checked={selected === t.value} onChange={() => choose(t.value)} className="mt-0.5" />
              <span>
                <span className="font-medium">{t.name}</span>
                <span className="block text-xs text-muted">{t.description}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
    );

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <fieldset disabled={pending} className="space-y-4">
        {renderGroup("Plantillas de DXW", own)}
        {renderGroup(own.length ? "Plantillas base" : "Plantilla", base)}
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-muted">Modo</span>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(CANVAS_MODE_LABELS) as CanvasMode[]).map((m) => (
              <label key={m} className={`flex cursor-pointer gap-2 rounded-md border p-3 text-sm ${mode === m ? "border-accent bg-accent/5" : "border-line hover:bg-canvas"}`}>
                <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="mt-0.5" />
                <span>
                  <span className="font-medium">{CANVAS_MODE_LABELS[m]}</span>
                  <span className="block text-xs text-muted">{CANVAS_MODE_HELP[m]}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="canvas-name" className="field-label">Nombre del mapa</label>
          <input id="canvas-name" name="name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Ej.: Embudo de captación Q1" />
        </div>
      </fieldset>
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Creando…" : "Crear mapa y abrir"}
      </button>
    </form>
  );
}
