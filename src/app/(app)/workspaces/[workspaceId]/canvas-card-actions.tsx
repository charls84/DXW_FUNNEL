"use client";

import { useState, useTransition } from "react";
import { deleteCanvas, duplicateCanvas } from "@/app/canvas-actions";

export function CanvasCardActions({ canvasId, workspaceId, name }: { canvasId: string; workspaceId: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  if (confirming) {
    return (
      <div className="mt-3 space-y-2 border-t border-line pt-3">
        <p className="text-xs">¿Eliminar &quot;{name}&quot;? Se borran el mapa, sus versiones y sus links compartidos. No se puede deshacer.</p>
        <div className="flex gap-2">
          <button type="button" disabled={pending} onClick={() => start(() => deleteCanvas(canvasId, workspaceId))} className="btn-danger py-1 text-xs">
            {pending ? "Eliminando…" : "Eliminar mapa"}
          </button>
          <button type="button" disabled={pending} onClick={() => setConfirming(false)} className="btn-secondary py-1 text-xs">Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 flex gap-3 border-t border-line pt-3 text-xs">
      <button type="button" disabled={pending} onClick={() => start(() => duplicateCanvas(canvasId))} className="text-accent hover:underline">
        {pending ? "Duplicando…" : "Duplicar"}
      </button>
      <button type="button" onClick={() => setConfirming(true)} className="text-danger hover:underline">Eliminar</button>
    </div>
  );
}
