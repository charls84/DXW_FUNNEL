"use client";

import { useState, useTransition } from "react";
import { deleteCanvas, duplicateCanvas } from "@/app/canvas-actions";

export function CanvasCardActions({ canvasId, workspaceId, name }: { canvasId: string; workspaceId: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  if (confirming) {
    return (
      <div className="space-y-2 border-t border-line pt-3">
        <p className="text-xs">¿Enviar &quot;{name}&quot; a la papelera? Podrás restaurarlo durante 30 días. Sus links compartidos dejarán de funcionar.</p>
        <div className="flex gap-2">
          <button type="button" disabled={pending} onClick={() => start(() => deleteCanvas(canvasId, workspaceId))} className="btn-danger py-1 text-xs">
            {pending ? "Enviando…" : "Enviar a la papelera"}
          </button>
          <button type="button" disabled={pending} onClick={() => setConfirming(false)} className="btn-secondary py-1 text-xs">Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 border-t border-line pt-3 text-xs">
      <button type="button" disabled={pending} onClick={() => start(() => duplicateCanvas(canvasId))} className="text-accent hover:underline">
        {pending ? "Duplicando…" : "Duplicar"}
      </button>
      <button type="button" onClick={() => setConfirming(true)} className="text-danger hover:underline">Eliminar</button>
    </div>
  );
}
