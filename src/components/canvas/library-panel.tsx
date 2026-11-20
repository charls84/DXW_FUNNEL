"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { CATALOG, CATEGORY_META, stepColors } from "@/lib/canvas/catalog";
import type { NodeCategory } from "@/lib/canvas/types";
import type { CustomIcon } from "./canvas-editor";
import { UploadButton, type UploadImage } from "./upload-button";
import { useForecast } from "./forecast-context";
import type { ExplorerEntry } from "@/lib/crm/actuals";

export const DRAG_MIME = "application/x-dxw-node";

const ORDER: NodeCategory[] = ["source", "brand", "page", "action", "offline", "process", "crm"];

type LibraryProps = {
  onAdd: (catalogKey: string) => void;
  /** null: el workspace no tiene íconos propios disponibles (por ejemplo, en la vista de prueba). */
  customIcons?: CustomIcon[] | null;
  onAddCustomIcon?: (icon: CustomIcon) => void;
  upload?: UploadImage;
  onIconUploaded?: (url: string, file: File) => void;
  onRemoveIcon?: (id: string) => void;
  /** Agrega un paso ya conectado a un origen, etapa o evento del CRM. */
  onAddCrmStep?: (entry: ExplorerEntry) => void;
};

export function LibraryPanel({ onAdd, customIcons, onAddCustomIcon, upload, onIconUploaded, onRemoveIcon, onAddCrmStep }: LibraryProps) {
  const [query, setQuery] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [tab, setTab] = useState<"elements" | "crm">("elements");
  const q = query.trim().toLowerCase();
  const fc = useForecast();
  const explorer = fc?.crm.available ? fc.explorer : null;

  const groups = useMemo(
    () =>
      ORDER.map((cat) => ({
        cat,
        items: CATALOG.filter((i) => i.category === cat && (!q || `${i.label} ${i.keywords ?? ""}`.toLowerCase().includes(q))),
      })).filter((g) => g.items.length > 0),
    [q],
  );

  if (explorer && tab === "crm") {
    const groups: { title: string; hint: string; items: ExplorerEntry[] }[] = [
      { title: "Orígenes de leads", hint: "Lead creado por origen", items: explorer.sources },
      { title: "Etapas del pipeline", hint: "Contactos que llegaron a cada etapa", items: explorer.stages },
      { title: "Eventos", hint: "Citas, cierres y pagos", items: explorer.events },
    ].map((g) => ({ ...g, items: g.items.filter((i) => !q || i.label.toLowerCase().includes(q)) }));
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-line p-3">
          <Tabs tab={tab} setTab={setTab} />
          <label htmlFor="lib-search" className="sr-only">Buscar en el CRM</label>
          <input id="lib-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar etapas u orígenes…" className="input mt-2 py-1.5" />
          <p className="field-help">Lo que existe en tu CRM en los últimos {fc?.settings.days} días ({explorer.contacts} contactos). Haz clic para agregarlo al mapa ya conectado.</p>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-3">
          {explorer.contacts === 0 && <p className="text-sm text-muted">Todavía no hay eventos del CRM en este período.</p>}
          {groups.map((g) =>
            g.items.length === 0 ? null : (
              <section key={g.title}>
                <h3 className="text-xs font-semibold text-muted">{g.title}</h3>
                <p className="mb-1.5 text-[11px] text-muted">{g.hint}</p>
                <ul className="space-y-1">
                  {g.items.map((item) => (
                    <li key={item.label}>
                      <button
                        type="button"
                        onClick={() => onAddCrmStep?.(item)}
                        className="flex w-full items-center justify-between gap-2 rounded-md border border-line px-2 py-1.5 text-left text-xs hover:border-accent hover:bg-canvas"
                        title="Agregar al mapa"
                      >
                        <span className="truncate">{item.label}</span>
                        <span className="shrink-0 rounded-full bg-accent/10 px-1.5 text-[11px] font-semibold text-accent">{item.count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ),
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line p-3">
        {explorer && <Tabs tab={tab} setTab={setTab} />}
        <label htmlFor="lib-search" className="sr-only">Buscar elementos</label>
        <input
          id="lib-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar elementos…"
          className={`input py-1.5 ${explorer ? "mt-2" : ""}`}
        />
        <p className="field-help">Arrastra un elemento al mapa o haz clic para agregarlo al centro.</p>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {groups.length === 0 && <p className="text-sm text-muted">No hay elementos con ese nombre.</p>}
        {groups.map(({ cat, items }) => (
          <section key={cat}>
            <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_META[cat].color }} />
              {CATEGORY_META[cat].label}
            </h3>
            <ul className="grid grid-cols-3 gap-1.5">
              {items.map((item) => {
                const Icon = item.icon;
                const colors = stepColors(item);
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(DRAG_MIME, item.key);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={() => onAdd(item.key)}
                      title={item.label}
                      className="flex w-full flex-col items-center gap-1 rounded-md p-1.5 text-center hover:bg-canvas"
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center ${cat === "process" ? "rounded-lg" : "rounded-full"}`}
                        style={{ backgroundColor: colors.bg, color: colors.fg }}
                      >
                        <Icon size={18} aria-hidden />
                      </span>
                      <span className="line-clamp-2 text-[10.5px] leading-tight text-ink">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {customIcons && !q && (
          <section>
            <h3 className="mb-1.5 text-xs font-semibold text-muted">Logos e íconos del equipo</h3>
            {customIcons.length === 0 && <p className="mb-2 text-xs text-muted">Sube el logo de WhatsApp, LinkedIn o del cliente y úsalo como paso en cualquier mapa de este workspace.</p>}
            <ul className="grid grid-cols-3 gap-1.5">
              {customIcons.map((icon) => (
                <li key={icon.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onAddCustomIcon?.(icon)}
                    title={icon.name}
                    className="flex w-full flex-col items-center gap-1 rounded-md p-1.5 text-center hover:bg-canvas"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={icon.url} alt="" className="h-9 w-9 rounded-full border border-line bg-surface object-contain p-0.5" />
                    <span className="line-clamp-2 text-[10.5px] leading-tight text-ink">{icon.name}</span>
                  </button>
                  {onRemoveIcon &&
                    (confirmRemove === icon.id ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-md bg-surface/95 p-1 text-center text-[10px]">
                        ¿Quitar?
                        <button type="button" onClick={() => { onRemoveIcon(icon.id); setConfirmRemove(null); }} className="font-medium text-danger">Quitar</button>
                        <button type="button" onClick={() => setConfirmRemove(null)} className="text-muted">Cancelar</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmRemove(icon.id)}
                        aria-label={`Quitar ícono ${icon.name}`}
                        className="absolute right-0.5 top-0.5 rounded-full bg-surface p-0.5 text-muted opacity-0 hover:text-danger group-hover:opacity-100"
                      >
                        <X size={11} />
                      </button>
                    ))}
                </li>
              ))}
            </ul>
            {upload && onIconUploaded && (
              <div className="mt-2">
                <UploadButton upload={upload} onUploaded={onIconUploaded} label="Subir ícono" />
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function Tabs({ tab, setTab }: { tab: "elements" | "crm"; setTab: (t: "elements" | "crm") => void }) {
  const cls = (active: boolean) => `flex-1 rounded-md px-2 py-1 text-xs font-medium ${active ? "bg-accent text-accent-ink" : "text-muted hover:bg-canvas"}`;
  return (
    <div role="tablist" className="flex gap-1 rounded-md border border-line p-0.5">
      <button type="button" role="tab" aria-selected={tab === "elements"} onClick={() => setTab("elements")} className={cls(tab === "elements")}>Elementos</button>
      <button type="button" role="tab" aria-selected={tab === "crm"} onClick={() => setTab("crm")} className={cls(tab === "crm")}>Desde el CRM</button>
    </div>
  );
}
