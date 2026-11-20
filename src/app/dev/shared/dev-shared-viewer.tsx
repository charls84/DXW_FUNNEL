"use client";

import { useState } from "react";
import { SharedCanvasViewer } from "@/components/canvas/canvas-editor";
import { buildTemplate } from "@/lib/canvas/templates";
import { sanitizeDoc } from "@/lib/canvas/doc";
import type { CanvasDoc } from "@/lib/canvas/types";

/** Igual que get_shared_canvas sin notas: quita notas y checklists del mapa y de cada paso. */
function stripNotes(doc: CanvasDoc): CanvasDoc {
  return {
    ...doc,
    notes: undefined,
    checklist: undefined,
    nodes: doc.nodes.map((n) => (n.type === "step" ? { ...n, data: { ...n.data, notes: undefined, checklist: undefined } } : n)),
  };
}

export default function DevSharedViewer() {
  const [doc] = useState<CanvasDoc>(() => {
    try {
      const raw = localStorage.getItem("dxw-dev-canvas");
      return stripNotes(raw ? sanitizeDoc(JSON.parse(raw).doc) : buildTemplate("dxw-sales-process"));
    } catch {
      return stripNotes(buildTemplate("dxw-sales-process"));
    }
  });
  return <SharedCanvasViewer name="Prueba local · Proceso comercial DXW" doc={doc} />;
}
