"use client";

import { useEffect, useRef } from "react";

export type MenuItem = { label: string; onSelect: () => void; danger?: boolean; disabled?: boolean; shortcut?: string } | "separator";

/** Menú contextual (clic derecho) anclado a coordenadas de pantalla. Se cierra con Escape o al hacer clic fuera. */
export function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  // Que no se salga de la ventana.
  const left = Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 9999) - 230);
  const top = Math.min(y, (typeof window !== "undefined" ? window.innerHeight : 9999) - items.length * 32 - 16);

  return (
    <div ref={ref} role="menu" className="fixed z-50 min-w-[210px] rounded-md border border-line bg-surface py-1 text-sm shadow-lg" style={{ left, top }}>
      {items.map((item, i) =>
        item === "separator" ? (
          <div key={i} className="my-1 h-px bg-line" />
        ) : (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              onClose();
              item.onSelect();
            }}
            className={`flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left hover:bg-canvas disabled:opacity-40 ${item.danger ? "text-danger" : "text-ink"}`}
          >
            <span>{item.label}</span>
            {item.shortcut && <span className="text-[11px] text-muted">{item.shortcut}</span>}
          </button>
        ),
      )}
    </div>
  );
}
