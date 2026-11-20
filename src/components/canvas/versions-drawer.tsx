"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { CanvasDoc } from "@/lib/canvas/types";

export type RevisionSummary = { id: string; note: string | null; isAuto: boolean; createdAt: string; author: string | null };

type Props = {
  readOnly: boolean;
  hasUnsavedChanges: boolean;
  onClose: () => void;
  listRevisions: () => Promise<RevisionSummary[]>;
  createRevision: (note: string) => Promise<{ ok: boolean }>;
  restoreRevision: (id: string) => Promise<{ ok: true; doc: CanvasDoc; version: number } | { ok: false }>;
  onRestored: (doc: CanvasDoc, version: number) => void;
};

const fmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

export function VersionsDrawer(p: Props) {
  const [items, setItems] = useState<RevisionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = () =>
    p
      .listRevisions()
      .then((r) => {
        setItems(r);
        setError(null);
      })
      .catch(() => setError("No pudimos cargar las versiones. Intenta de nuevo."));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setBusy("save");
    const r = await p.createRevision(note.trim());
    setBusy(null);
    if (r.ok) {
      setNote("");
      load();
    } else setError("No pudimos guardar la versión. Intenta de nuevo.");
  }

  async function restore(id: string) {
    setBusy(id);
    const r = await p.restoreRevision(id);
    setBusy(null);
    setConfirmId(null);
    if (r.ok) p.onRestored(r.doc, r.version);
    else setError("No pudimos restaurar la versión. Intenta de nuevo.");
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={p.onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="versions-title" className="flex h-full w-96 flex-col bg-surface shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 id="versions-title" className="font-semibold">Versiones</h2>
          <button type="button" onClick={p.onClose} className="rounded p-1 text-muted hover:bg-canvas" aria-label="Cerrar versiones"><X size={18} /></button>
        </div>

        {!p.readOnly && (
          <div className="space-y-2 border-b border-line p-4">
            <label htmlFor="rev-note" className="field-label">Guardar una versión con nombre</label>
            <input id="rev-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className="input" placeholder="Ej.: Versión presentada al cliente" />
            <button type="button" onClick={save} disabled={busy !== null || p.hasUnsavedChanges} className="btn-primary w-full">
              {busy === "save" ? "Guardando…" : "Guardar versión"}
            </button>
            {p.hasUnsavedChanges && <p className="field-help">Espera a que se guarden los cambios para crear una versión.</p>}
            <p className="field-help">También se guarda una versión automática cada 10 minutos mientras editas.</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {error && <p role="alert" className="mb-3 text-sm text-danger">{error}</p>}
          {items === null && !error && <p className="text-sm text-muted">Cargando versiones…</p>}
          {items?.length === 0 && <p className="text-sm text-muted">Todavía no hay versiones guardadas.</p>}
          <ul className="space-y-2">
            {items?.map((r) => (
              <li key={r.id} className="card p-3">
                <p className="text-sm font-medium">{r.note || (r.isAuto ? "Guardado automático" : "Versión sin nombre")}</p>
                <p className="text-xs text-muted">
                  {fmt.format(new Date(r.createdAt))}
                  {r.author ? ` · ${r.author}` : ""}
                </p>
                {!p.readOnly &&
                  (confirmId === r.id ? (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs">¿Restaurar esta versión? El mapa actual se guarda antes como versión, así que puedes volver a él.</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => restore(r.id)} disabled={busy !== null} className="btn-primary py-1 text-xs">
                          {busy === r.id ? "Restaurando…" : "Restaurar"}
                        </button>
                        <button type="button" onClick={() => setConfirmId(null)} className="btn-secondary py-1 text-xs">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmId(r.id)} className="mt-2 text-xs text-accent hover:underline">
                      Restaurar esta versión
                    </button>
                  ))}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
