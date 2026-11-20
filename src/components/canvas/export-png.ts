"use client";

import { getNodesBounds, getViewportForBounds, type Node } from "@xyflow/react";
import { toPng } from "html-to-image";

/** Exporta todo el mapa (no solo lo visible) como PNG y lo descarga. */
export async function exportFlowPng(nodes: Node[], fileName: string, scale = 2) {
  const viewportEl = document.querySelector<HTMLElement>(".react-flow__viewport");
  if (!viewportEl || nodes.length === 0) throw new Error("No hay nada que exportar.");

  const bounds = getNodesBounds(nodes);
  const padding = 48;
  const width = Math.min(Math.ceil(bounds.width + padding * 2), 8000);
  const height = Math.min(Math.ceil(bounds.height + padding * 2), 8000);
  // Zoom fijo en 1: la imagen mide lo mismo que el mapa más el margen, centrado.
  const vp = getViewportForBounds(bounds, width, height, 1, 1, 0);
  const bg = getComputedStyle(document.body).backgroundColor || "#ffffff";

  const dataUrl = await toPng(viewportEl, {
    backgroundColor: bg,
    width,
    height,
    pixelRatio: scale,
    // Sin puntos de conexión ni controles de tamaño en la imagen.
    filter: (el) => !(el instanceof HTMLElement && (el.classList.contains("react-flow__handle") || el.classList.contains("react-flow__resize-control"))),
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
    },
  });

  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${fileName.replace(/[^\p{L}\p{N}\-_ ]/gu, "").trim() || "mapa"}.png`;
  a.click();
}
