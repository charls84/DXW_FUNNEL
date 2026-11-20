import type { CanvasSummary } from "@/lib/canvases";
import { CATEGORY_META } from "@/lib/canvas/catalog";

/** Miniatura SVG del mapa a partir de las posiciones de sus elementos. No muestra textos ni datos. */
export function CanvasPreview({ preview, className = "" }: { preview: CanvasSummary["preview"]; className?: string }) {
  const { nodes, edges } = preview;
  const W = 320;
  const H = 150;
  if (nodes.length === 0) {
    return (
      <div className={`flex items-center justify-center rounded-md bg-canvas text-xs text-muted ${className}`} style={{ aspectRatio: `${W}/${H}` }}>
        Mapa vacío
      </div>
    );
  }
  const pts = nodes.map((n) => ({ ...n, cx: n.x + (n.w ?? 150) / 2, cy: n.y + (n.h ?? 60) / 2 }));
  const minX = Math.min(...pts.map((p) => p.cx)) - 60;
  const maxX = Math.max(...pts.map((p) => p.cx)) + 60;
  const minY = Math.min(...pts.map((p) => p.cy)) - 60;
  const maxY = Math.max(...pts.map((p) => p.cy)) + 60;
  const scale = Math.min(W / Math.max(1, maxX - minX), H / Math.max(1, maxY - minY));
  const ox = (W - (maxX - minX) * scale) / 2;
  const oy = (H - (maxY - minY) * scale) / 2;
  const sx = (x: number) => ox + (x - minX) * scale;
  const sy = (y: number) => oy + (y - minY) * scale;
  const r = Math.max(2.5, Math.min(6, 8 * scale * 4));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`rounded-md bg-canvas ${className}`} role="img" aria-label="Vista previa del mapa" style={{ aspectRatio: `${W}/${H}` }}>
      {pts.map((p, i) =>
        p.type === "shape" ? (
          <rect key={`s${i}`} x={sx(p.x)} y={sy(p.y)} width={(p.w ?? 240) * scale} height={(p.h ?? 160) * scale} rx={3} fill="var(--accent)" opacity={0.08} stroke="var(--accent)" strokeOpacity={0.3} />
        ) : null,
      )}
      {edges.map((e, i) => (
        <line key={i} x1={sx(pts[e.s].cx)} y1={sy(pts[e.s].cy)} x2={sx(pts[e.t].cx)} y2={sy(pts[e.t].cy)} stroke="var(--muted)" strokeOpacity={0.5} strokeWidth={1} />
      ))}
      {pts.map((p, i) => {
        if (p.type === "shape") return null;
        if (p.type === "text" || p.type === "widget" || p.type === "image") {
          return <rect key={i} x={sx(p.cx) - r * 1.6} y={sy(p.cy) - r * 0.5} width={r * 3.2} height={r} rx={1} fill="var(--muted)" opacity={0.35} />;
        }
        const color = (p.category && CATEGORY_META[p.category as keyof typeof CATEGORY_META]?.color) || "#94a3b8";
        return p.category === "process" ? (
          <rect key={i} x={sx(p.cx) - r} y={sy(p.cy) - r} width={r * 2} height={r * 2} rx={r * 0.4} fill={color} />
        ) : (
          <circle key={i} cx={sx(p.cx)} cy={sy(p.cy)} r={r} fill={color} />
        );
      })}
    </svg>
  );
}
