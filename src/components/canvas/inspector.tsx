"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { CATALOG, CATEGORY_META, getCatalogItem } from "@/lib/canvas/catalog";
import { CANVAS_MODE_HELP, CANVAS_MODE_LABELS, ICON_SIZES, LINE_TYPE_HELP, LINE_TYPE_LABELS, type CanvasMode, type ChecklistItem, type EdgeData, type IconSize, type ImageData, type LineType, type ShapeData, type StepData, type TextData } from "@/lib/canvas/types";
import type { AppNode, FlowEdgeT } from "./flow-types";
import type { CustomIcon } from "./canvas-editor";
import { ChecklistEditor } from "./checklist-editor";
import { TagsEditor } from "./tags-editor";
import { UploadButton, type UploadImage } from "./upload-button";
import { CanvasForecastSection, EdgeForecastSection, StepForecastSection } from "./inspector-forecast";
import { StepCrmSection } from "./inspector-crm";
import { useForecast } from "./forecast-context";
import type { StepCrmMatch } from "@/lib/crm/types";
import type { PeopleTarget } from "./people-drawer";
import type { ForecastSettings } from "@/lib/forecast/types";

type Props = {
  node: AppNode | null;
  edge: FlowEdgeT | null;
  readOnly: boolean;
  canvasNotes: string;
  canvasChecklist: ChecklistItem[];
  onCanvasNotes: (v: string) => void;
  onCanvasChecklist: (v: ChecklistItem[]) => void;
  onNodeData: (id: string, patch: Partial<StepData> | Partial<TextData> | Partial<ShapeData> | Partial<ImageData>) => void;
  onEdgeData: (id: string, patch: Partial<EdgeData>) => void;
  onDelete: () => void;
  upload?: UploadImage;
  customIcons?: CustomIcon[];
  details?: { tags: string[]; isTemplate: boolean; onTags: (t: string[]) => void; onTemplate: (v: boolean) => void } | null;
  onForecastSettings?: (patch: Partial<ForecastSettings>) => void;
  onShowPeople?: (target: PeopleTarget) => void;
  /** Modo prototipo: solo el flujo; se ocultan simulación y CRM. */
  prototype?: boolean;
  mode?: CanvasMode;
  onMode?: (m: CanvasMode) => void;
  /** Al subir un logo desde un paso, también se guarda en la biblioteca del equipo. */
  onIconUploaded?: (url: string, file: File) => void;
};

const SHAPE_COLORS = ["#1d5bd6", "#0f766e", "#c2410c", "#7c3aed", "#be185d", "#334155"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-b border-line p-4 last:border-0">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  );
}

export function Inspector(p: Props) {
  const ro = p.readOnly;

  if (p.edge) {
    const data = p.edge.data ?? { lineType: "direct" as LineType };
    return (
      <div>
        <Section title="Línea">
          <fieldset disabled={ro} className="space-y-2">
            {(Object.keys(LINE_TYPE_LABELS) as LineType[]).map((t) => (
              <label key={t} className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="lineType"
                  checked={data.lineType === t}
                  onChange={() => p.onEdgeData(p.edge!.id, { lineType: t })}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">{LINE_TYPE_LABELS[t]}</span>
                  <span className="block text-xs text-muted">{LINE_TYPE_HELP[t]}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="pt-2">
            <label htmlFor="edge-label" className="field-label">Etiqueta (opcional)</label>
            <input
              id="edge-label"
              value={data.label ?? ""}
              onChange={(e) => p.onEdgeData(p.edge!.id, { label: e.target.value })}
              disabled={ro}
              maxLength={80}
              className="input"
              placeholder="Ej.: Sí, No, 3 días después"
            />
          </div>
        </Section>
        {data.lineType !== "visual" && !p.prototype && (
          <Section title="Simulación">
            <EdgeForecastSection edgeId={p.edge.id} value={data.forecast} onChange={(forecast) => p.onEdgeData(p.edge!.id, { forecast })} readOnly={ro} />
          </Section>
        )}
        {data.lineType !== "visual" && p.onShowPeople && <EdgePeople edgeId={p.edge.id} onShow={() => p.onShowPeople!({ kind: "edge", id: p.edge!.id, label: data.label || "línea" })} />}
        {!ro && <DeleteButton label="Eliminar línea" onClick={p.onDelete} />}
      </div>
    );
  }

  if (p.node?.type === "step") {
    const n = p.node;
    const d = n.data;
    const item = getCatalogItem(d.catalogKey);
    const showProcess = d.category === "process" || d.category === "crm" || d.category === "offline";
    const set = (patch: Partial<StepData>) => p.onNodeData(n.id, patch);

    return (
      <div>
        <Section title="Paso">
          <fieldset disabled={ro} className="space-y-3">
            <div>
              <label htmlFor="step-label" className="field-label">Nombre</label>
              <input id="step-label" value={d.label} maxLength={120} onChange={(e) => set({ label: e.target.value })} className="input" />
            </div>
            <div>
              <label htmlFor="step-kind" className="field-label">Tipo de elemento</label>
              <select
                id="step-kind"
                value={d.catalogKey}
                onChange={(e) => {
                  const next = getCatalogItem(e.target.value);
                  const keepLabel = d.label && d.label !== item.label;
                  set({ catalogKey: next.key, category: next.category, label: keepLabel ? d.label : next.label });
                }}
                className="input"
              >
                {(Object.keys(CATEGORY_META) as (keyof typeof CATEGORY_META)[]).map((cat) => (
                  <optgroup key={cat} label={CATEGORY_META[cat].label}>
                    {CATALOG.filter((c) => c.category === cat).map((c) => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            {d.category === "page" && (
              <div>
                <label htmlFor="step-url" className="field-label">Dirección de la página (opcional)</label>
                <input id="step-url" value={d.url ?? ""} maxLength={500} onChange={(e) => set({ url: e.target.value })} className="input" placeholder="cliente.com/agenda" />
                <p className="field-help">Servirá para medir visitas cuando se active el tracking web.</p>
              </div>
            )}
          </fieldset>
        </Section>

        {!ro && (
          <Section title="Imagen del paso">
            {d.category === "page" && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Captura de la página</p>
                {d.thumbnailUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={d.thumbnailUrl} alt="Captura actual" className="h-24 w-full rounded border border-line object-cover object-top" />
                    <button type="button" onClick={() => set({ thumbnailUrl: undefined })} className="text-xs text-danger hover:underline">Quitar captura</button>
                  </>
                ) : (
                  <p className="field-help">Muestra cómo se ve la página real dentro del mapa.</p>
                )}
                {p.upload && <UploadButton upload={p.upload} onUploaded={(url) => set({ thumbnailUrl: url })} label={d.thumbnailUrl ? "Cambiar captura" : "Subir captura"} />}
              </div>
            )}
            {!d.thumbnailUrl && (
              <div className="space-y-2 pt-1">
                <label htmlFor="step-icon" className="field-label">Ícono</label>
                <select
                  id="step-icon"
                  value={d.iconUrl ?? ""}
                  onChange={(e) => set({ iconUrl: e.target.value || undefined })}
                  className="input"
                >
                  <option value="">Ícono del catálogo ({item.label})</option>
                  {d.iconUrl && !p.customIcons?.some((i) => i.url === d.iconUrl) && <option value={d.iconUrl}>Ícono subido</option>}
                  {p.customIcons?.map((i) => (
                    <option key={i.id} value={i.url}>{i.name}</option>
                  ))}
                </select>
                {p.upload && p.onIconUploaded ? (
                  <>
                    <UploadButton upload={p.upload} onUploaded={(url, file) => { set({ iconUrl: url }); p.onIconUploaded!(url, file); }} label="Subir logo" />
                    <p className="field-help">PNG, JPG, SVG, WEBP o GIF hasta 5 MB. Queda en la biblioteca del equipo (Elementos → Logos e íconos del equipo) para usarlo en otros pasos.</p>
                  </>
                ) : (
                  p.upload && <UploadButton upload={p.upload} onUploaded={(url) => set({ iconUrl: url })} label="Subir ícono solo para este paso" />
                )}
                <div className="pt-1">
                  <span className="field-label">Tamaño del ícono</span>
                  <div role="group" aria-label="Tamaño del ícono" className="grid grid-cols-4 gap-1">
                    {(Object.keys(ICON_SIZES) as IconSize[]).map((s) => {
                      const active = (d.iconSize ?? "md") === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          aria-pressed={active}
                          onClick={() => set({ iconSize: s === "md" ? undefined : s })}
                          className={`rounded border px-1 py-1 text-[11px] ${active ? "border-accent bg-accent/10 text-accent" : "border-line text-muted hover:bg-canvas hover:text-ink"}`}
                        >
                          {ICON_SIZES[s].label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </Section>
        )}

        <CrmSectionWrapper nodeId={n.id} value={d.crm} onChange={(crm) => set({ crm })} readOnly={ro} onShowPeople={p.onShowPeople ? () => p.onShowPeople!({ kind: "step", id: n.id, label: d.label || item.label }) : undefined} />

        {!p.prototype && (
          <Section title="Simulación">
            <StepForecastSection nodeId={n.id} value={d.forecast} onChange={(forecast) => set({ forecast })} readOnly={ro} />
          </Section>
        )}

        {showProcess && (
          <Section title="Responsable y tiempos">
            <fieldset disabled={ro} className="space-y-3">
              <div>
                <label htmlFor="step-owner" className="field-label">Responsable</label>
                <input id="step-owner" value={d.process?.owner ?? ""} maxLength={120} onChange={(e) => set({ process: { ...d.process, owner: e.target.value } })} className="input" placeholder="Ej.: Comercial" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="step-sla" className="field-label">SLA (horas)</label>
                  <input
                    id="step-sla"
                    type="number"
                    min={0}
                    value={d.process?.slaHours ?? ""}
                    onChange={(e) => set({ process: { ...d.process, slaHours: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) } })}
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="step-tool" className="field-label">Herramienta</label>
                  <input id="step-tool" value={d.process?.tool ?? ""} maxLength={120} onChange={(e) => set({ process: { ...d.process, tool: e.target.value } })} className="input" placeholder="CRM DXW" />
                </div>
              </div>
              <p className="field-help">El SLA es el tiempo máximo que un caso debería pasar en esta etapa.</p>
            </fieldset>
          </Section>
        )}

        <Section title="Notas">
          <textarea
            value={d.notes ?? ""}
            onChange={(e) => set({ notes: e.target.value })}
            disabled={ro}
            rows={4}
            maxLength={5000}
            className="input"
            placeholder="Contexto, ideas o decisiones sobre este paso."
            aria-label="Notas del paso"
          />
        </Section>
        <Section title="Checklist">
          <ChecklistEditor items={d.checklist ?? []} onChange={(checklist) => set({ checklist })} readOnly={ro} />
        </Section>
        {!ro && <DeleteButton label="Eliminar paso" onClick={p.onDelete} />}
      </div>
    );
  }

  if (p.node?.type === "text") {
    const n = p.node;
    return (
      <div>
        <Section title="Texto">
          <fieldset disabled={ro} className="space-y-3">
            <textarea value={n.data.text} onChange={(e) => p.onNodeData(n.id, { text: e.target.value })} rows={4} maxLength={1000} className="input" aria-label="Texto" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="text-size" className="field-label">Tamaño</label>
                <select id="text-size" value={n.data.size} onChange={(e) => p.onNodeData(n.id, { size: e.target.value as TextData["size"] })} className="input">
                  <option value="sm">Pequeño</option>
                  <option value="md">Normal</option>
                  <option value="lg">Subtítulo</option>
                  <option value="xl">Título</option>
                </select>
              </div>
              <div>
                <label htmlFor="text-align" className="field-label">Alineación</label>
                <select id="text-align" value={n.data.align ?? "left"} onChange={(e) => p.onNodeData(n.id, { align: e.target.value === "left" ? undefined : (e.target.value as TextData["align"]) })} className="input">
                  <option value="left">Izquierda</option>
                  <option value="center">Centro</option>
                  <option value="right">Derecha</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!n.data.bold} onChange={(e) => p.onNodeData(n.id, { bold: e.target.checked || undefined })} /> Negrita
            </label>
            <div>
              <span className="field-label">Color</span>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => p.onNodeData(n.id, { color: undefined })} className={`h-7 w-7 rounded-full border border-line bg-surface text-[10px] text-ink ${!n.data.color ? "ring-2 ring-offset-2 ring-ink" : ""}`} aria-label="Color automático" title="Automático">Aa</button>
                {SHAPE_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => p.onNodeData(n.id, { color: c })} className={`h-7 w-7 rounded-full ${n.data.color === c ? "ring-2 ring-offset-2 ring-ink" : ""}`} style={{ backgroundColor: c }} aria-label={`Color ${c}`} />
                ))}
              </div>
            </div>
          </fieldset>
        </Section>
        {!ro && <DeleteButton label="Eliminar texto" onClick={p.onDelete} />}
      </div>
    );
  }

  if (p.node?.type === "shape") {
    const n = p.node;
    return (
      <div>
        <Section title="Forma">
          <fieldset disabled={ro} className="space-y-3">
            <div>
              <label htmlFor="shape-label" className="field-label">Título (opcional)</label>
              <input id="shape-label" value={n.data.label ?? ""} maxLength={120} onChange={(e) => p.onNodeData(n.id, { label: e.target.value })} className="input" placeholder="Ej.: Etapa de captación" />
            </div>
            <div>
              <label htmlFor="shape-kind" className="field-label">Forma</label>
              <select id="shape-kind" value={n.data.shape} onChange={(e) => p.onNodeData(n.id, { shape: e.target.value as ShapeData["shape"] })} className="input">
                <option value="rect">Rectángulo</option>
                <option value="ellipse">Elipse</option>
                <option value="triangle">Triángulo</option>
              </select>
            </div>
            <div>
              <span className="field-label">Color</span>
              <div className="flex gap-2">
                {SHAPE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => p.onNodeData(n.id, { color: c })}
                    className={`h-7 w-7 rounded-full ${n.data.color === c ? "ring-2 ring-offset-2 ring-ink" : ""}`}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>
          </fieldset>
          <p className="field-help">Usa formas para agrupar pasos por etapa. Arrastra sus bordes para cambiar el tamaño.</p>
        </Section>
        {!ro && <DeleteButton label="Eliminar forma" onClick={p.onDelete} />}
      </div>
    );
  }

  if (p.node?.type === "image") {
    const n = p.node;
    return (
      <div>
        <Section title="Imagen">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={n.data.url} alt="" className="max-h-40 w-full rounded border border-line object-contain" />
          <fieldset disabled={ro} className="space-y-3 pt-2">
            <div>
              <label htmlFor="image-alt" className="field-label">Descripción</label>
              <input id="image-alt" value={n.data.alt ?? ""} maxLength={200} onChange={(e) => p.onNodeData(n.id, { alt: e.target.value })} className="input" placeholder="Ej.: Correo de bienvenida" />
            </div>
            {p.upload && !ro && <UploadButton upload={p.upload} onUploaded={(url) => p.onNodeData(n.id, { url })} label="Reemplazar imagen" />}
          </fieldset>
          <p className="field-help">Arrastra las esquinas para cambiar el tamaño.</p>
        </Section>
        {!ro && <DeleteButton label="Eliminar imagen" onClick={p.onDelete} />}
      </div>
    );
  }

  if (p.node?.type === "widget") {
    return (
      <div>
        <Section title="Resumen de la simulación">
          <p className="text-xs text-muted">
            Muestra los totales del escenario elegido y compara los tres escenarios. Sale en el PNG y en los links compartidos.
          </p>
        </Section>
        {p.onForecastSettings && (
          <Section title="Simulación del mapa">
            <CanvasForecastSection onChange={p.onForecastSettings} readOnly={ro} />
          </Section>
        )}
        {!ro && <DeleteButton label="Quitar resumen" onClick={p.onDelete} />}
      </div>
    );
  }

  if (ro && !p.canvasNotes && p.canvasChecklist.length === 0) {
    return (
      <div className="p-4 text-sm text-muted">
        Selecciona un paso o una línea para ver sus detalles. Usa la rueda del mouse para acercar o alejar.
      </div>
    );
  }

  return (
    <div>
      {p.mode && p.onMode && <ModeSection mode={p.mode} onMode={p.onMode} readOnly={ro} />}
      {p.onForecastSettings && !p.prototype && (
        <Section title="Simulación del mapa">
          <CanvasForecastSection onChange={p.onForecastSettings} readOnly={ro} />
        </Section>
      )}
      {p.details && (
        <Section title="Detalles del mapa">
          <div>
            <span className="field-label">Tags</span>
            <TagsEditor tags={p.details.tags} onChange={p.details.onTags} readOnly={ro} />
          </div>
          <label className="flex items-start gap-2 pt-2 text-sm">
            <input type="checkbox" checked={p.details.isTemplate} onChange={(e) => p.details!.onTemplate(e.target.checked)} disabled={ro} className="mt-1" />
            <span>
              Usar como plantilla de DXW
              <span className="block text-xs text-muted">Aparece al crear mapas en cualquier workspace. Se copia; este mapa no cambia.</span>
            </span>
          </label>
        </Section>
      )}
      {(!ro || p.canvasNotes) && (
        <Section title="Notas del mapa">
          <textarea
            value={p.canvasNotes}
            onChange={(e) => p.onCanvasNotes(e.target.value)}
            disabled={ro}
            rows={6}
            maxLength={5000}
            className="input"
            placeholder="Objetivo del mapa, supuestos y decisiones."
            aria-label="Notas del mapa"
          />
        </Section>
      )}
      {(!ro || p.canvasChecklist.length > 0) && (
        <Section title="Checklist del mapa">
          <ChecklistEditor items={p.canvasChecklist} onChange={p.onCanvasChecklist} readOnly={ro} />
        </Section>
      )}
      {!ro && <Section title="Atajos">
        <ul className="space-y-1 text-xs text-muted">
          <li>Conecta pasos arrastrando desde los puntos de sus bordes.</li>
          <li>Supr o Retroceso: eliminar lo seleccionado.</li>
          <li>Ctrl + Z / Ctrl + Shift + Z: deshacer / rehacer.</li>
          <li>Ctrl + D: duplicar lo seleccionado.</li>
          <li>Shift + arrastrar: seleccionar varios.</li>
        </ul>
      </Section>}
    </div>
  );
}

/** Modo del mapa. En prototipo queda plegado en una línea; el selector aparece al hacer clic. */
function ModeSection({ mode, onMode, readOnly }: { mode: CanvasMode; onMode: (m: CanvasMode) => void; readOnly: boolean }) {
  const [open, setOpen] = useState(false);
  const collapsed = mode === "prototype" && !open;
  return (
    <Section title="Modo del mapa">
      {collapsed ? (
        <div className="flex items-center justify-between text-sm">
          <span>{CANVAS_MODE_LABELS[mode]}</span>
          {!readOnly && (
            <button type="button" onClick={() => setOpen(true)} className="text-xs text-accent hover:underline">Cambiar</button>
          )}
        </div>
      ) : (
        <>
          <label htmlFor="canvas-mode" className="sr-only">Modo del mapa</label>
          <select
            id="canvas-mode"
            value={mode}
            onChange={(e) => { onMode(e.target.value as CanvasMode); setOpen(false); }}
            disabled={readOnly}
            className="input"
          >
            {(Object.keys(CANVAS_MODE_LABELS) as CanvasMode[]).map((m) => (
              <option key={m} value={m}>{CANVAS_MODE_LABELS[m]}</option>
            ))}
          </select>
          <p className="field-help">{CANVAS_MODE_HELP[mode]}{mode === "prototype" ? " Los números que ya tenga el mapa se conservan y vuelven a verse al pasar a Completo." : ""}</p>
        </>
      )}
    </Section>
  );
}

function EdgePeople({ edgeId, onShow }: { edgeId: string; onShow: () => void }) {
  const fc = useForecast();
  const real = fc?.actual?.edges[edgeId];
  if (!fc?.crm.available || !real || real.people === 0) return null;
  return (
    <div className="px-4 pb-2">
      <button type="button" onClick={onShow} className="text-xs font-medium text-accent hover:underline">
        Ver quiénes pasaron por esta línea ({fc.count(real.people)})
      </button>
    </div>
  );
}

function DeleteButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="p-4">
      <button type="button" onClick={onClick} className="btn-danger w-full">
        <Trash2 size={14} aria-hidden /> {label}
      </button>
    </div>
  );
}

/** La sección de CRM solo aparece si el mapa tiene acceso a datos reales. */
function CrmSectionWrapper(props: { nodeId: string; value: StepCrmMatch | undefined; onChange: (v: StepCrmMatch | undefined) => void; readOnly: boolean; onShowPeople?: () => void }) {
  const fc = useForecast();
  if (!fc?.crm.available) return null;
  return (
    <Section title="Datos reales (CRM)">
      <StepCrmSection {...props} />
    </Section>
  );
}
