import type { ComponentType } from "react";
import type { SimpleIcon } from "simple-icons";

/** Props mínimas que comparten los íconos de Lucide y los logos de marca. */
export type IconProps = { size?: number | string; strokeWidth?: number | string; className?: string; "aria-hidden"?: boolean | "true" | "false" };
export type IconComponent = ComponentType<IconProps>;

/** Logo oficial desde Simple Icons (licencia CC0). Se pinta con `currentColor`. */
export function brandIcon(si: SimpleIcon): IconComponent {
  function Brand({ size = 24, className, "aria-hidden": hidden = true }: IconProps) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden={hidden} role="img">
        <path d={si.path} />
      </svg>
    );
  }
  Brand.displayName = `Brand(${si.title})`;
  return Brand;
}

/** Monograma para marcas cuyo logo no está disponible en Simple Icons. Se puede reemplazar subiendo el logo real. */
export function letterIcon(text: string): IconComponent {
  const label = text.slice(0, 3);
  const fontSize = label.length === 1 ? 14 : label.length === 2 ? 11.5 : 9;
  function Letter({ size = 24, className, "aria-hidden": hidden = true }: IconProps) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden={hidden} role="img">
        <text x="12" y="12.5" textAnchor="middle" dominantBaseline="central" fontSize={fontSize} fontWeight={700} fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif" fill="currentColor">
          {label}
        </text>
      </svg>
    );
  }
  Letter.displayName = `Letter(${label})`;
  return Letter;
}

/** Color del logo sobre un fondo de marca: blanco, o casi negro si el fondo es muy claro (por ejemplo, el amarillo de Snapchat). */
export function inkFor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.75 ? "#0f172a" : "#ffffff";
}
