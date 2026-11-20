import type { AppNode } from "./flow-types";

export type AlignKind = "left" | "centerX" | "right" | "top" | "centerY" | "bottom" | "distributeX" | "distributeY";

export const ALIGN_LABELS: Record<AlignKind, string> = {
  left: "Alinear a la izquierda",
  centerX: "Centrar en horizontal",
  right: "Alinear a la derecha",
  top: "Alinear arriba",
  centerY: "Centrar en vertical",
  bottom: "Alinear abajo",
  distributeX: "Distribuir en horizontal",
  distributeY: "Distribuir en vertical",
};

const DEFAULT = { step: { w: 150, h: 110 }, text: { w: 200, h: 32 }, widget: { w: 460, h: 320 } } as const;

function sizeOf(n: AppNode): { w: number; h: number } {
  const w = n.measured?.width ?? n.width ?? (n.type in DEFAULT ? DEFAULT[n.type as keyof typeof DEFAULT].w : 240);
  const h = n.measured?.height ?? n.height ?? (n.type in DEFAULT ? DEFAULT[n.type as keyof typeof DEFAULT].h : 160);
  return { w, h };
}

/** Devuelve las nuevas posiciones de los nodos seleccionados. Los no seleccionados no cambian. */
export function alignNodes(nodes: AppNode[], kind: AlignKind): Map<string, { x: number; y: number }> {
  const sel = nodes.filter((n) => n.selected);
  const out = new Map<string, { x: number; y: number }>();
  if (sel.length < 2) return out;
  const boxes = sel.map((n) => ({ n, ...sizeOf(n), x: n.position.x, y: n.position.y }));
  const minX = Math.min(...boxes.map((b) => b.x));
  const maxR = Math.max(...boxes.map((b) => b.x + b.w));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxB = Math.max(...boxes.map((b) => b.y + b.h));

  if (kind === "distributeX" || kind === "distributeY") {
    if (sel.length < 3) return out;
    const horizontal = kind === "distributeX";
    const sorted = [...boxes].sort((a, b) => (horizontal ? a.x - b.x : a.y - b.y));
    const totalSize = sorted.reduce((s, b) => s + (horizontal ? b.w : b.h), 0);
    const span = horizontal ? maxR - minX : maxB - minY;
    const gap = Math.max(0, (span - totalSize) / (sorted.length - 1));
    let cursor = horizontal ? minX : minY;
    for (const b of sorted) {
      out.set(b.n.id, horizontal ? { x: Math.round(cursor), y: b.y } : { x: b.x, y: Math.round(cursor) });
      cursor += (horizontal ? b.w : b.h) + gap;
    }
    return out;
  }

  const cx = (minX + maxR) / 2;
  const cy = (minY + maxB) / 2;
  for (const b of boxes) {
    let x = b.x;
    let y = b.y;
    if (kind === "left") x = minX;
    if (kind === "centerX") x = cx - b.w / 2;
    if (kind === "right") x = maxR - b.w;
    if (kind === "top") y = minY;
    if (kind === "centerY") y = cy - b.h / 2;
    if (kind === "bottom") y = maxB - b.h;
    out.set(b.n.id, { x: Math.round(x), y: Math.round(y) });
  }
  return out;
}
