"use client";

import { useState, useTransition } from "react";
import { purgeCanvas, restoreCanvas } from "@/app/canvas-actions";

const fmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" });
const DAYS = 30;

export function TrashList({ items, workspaceId, isAdmin }: { items: { id: string; name: string; deletedAt: string }[]; workspaceId: string; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  // Fecha fijada al montar: evita llamar a Date.now() en cada render.
  const [now] = useState(() => Date.now());
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const daysLeft = (iso: string) => Math.max(0, DAYS - Math.floor((now - new Date(iso).getTime()) / 86_400_000));

  return (
    <section className="mt-6 rounded-lg border border-dashed border-line p-4">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left text-sm">
        <span className="font-medium">Papelera ({items.length})</span>
        <span className="text-xs text-muted">{open ? "Ocultar" : "Ver"}</span>
      </button>
      {open && (
        <>
          <p className="mt-1 text-xs text-muted">Los mapas eliminados se pueden restaurar durante {DAYS} días. Sus links compartidos no funcionan mientras estén aquí.</p>
          <ul className="mt-3 divide-y divide-line text-sm">
            {items.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-muted">Eliminado el {fmt.format(new Date(t.deletedAt))} · {daysLeft(t.deletedAt)} días para restaurar</p>
                </div>
                <div className="flex gap-3 text-xs">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => start(async () => { const r = await restoreCanvas(t.id, workspaceId); if (!r.ok) setError("No pudimos restaurar el mapa. Intenta de nuevo."); })}
                    className="text-accent hover:underline"
                  >
                    Restaurar
                  </button>
                  {isAdmin &&
                    (confirm === t.id ? (
                      <span className="flex items-center gap-2">
                        ¿Borrar definitivamente? No se puede deshacer.
                        <button type="button" disabled={pending} onClick={() => start(async () => { const r = await purgeCanvas(t.id, workspaceId); setConfirm(null); if (!r.ok) setError("No pudimos borrar el mapa."); })} className="font-medium text-danger hover:underline">Borrar</button>
                        <button type="button" onClick={() => setConfirm(null)} className="text-muted hover:underline">Cancelar</button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setConfirm(t.id)} className="text-danger hover:underline">Borrar definitivamente</button>
                    ))}
                </div>
              </li>
            ))}
          </ul>
          {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
        </>
      )}
    </section>
  );
}
