"use client";

import { useCallback, useRef, useState } from "react";
import type { AppNode, FlowEdgeT } from "./flow-types";

type Snapshot = { nodes: AppNode[]; edges: FlowEdgeT[] };
const LIMIT = 60;
const COALESCE_MS = 1000;

/**
 * Deshacer / rehacer con instantáneas. `record(key)` guarda el estado ANTES de un cambio;
 * cambios seguidos con la misma clave (por ejemplo, escribir en un campo) se agrupan en uno.
 */
export function useHistory(getCurrent: () => Snapshot, apply: (s: Snapshot) => void) {
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const last = useRef<{ key: string; at: number } | null>(null);
  const [counts, setCounts] = useState({ past: 0, future: 0 });
  const sync = () => setCounts({ past: past.current.length, future: future.current.length });

  const record = useCallback(
    (key = "action") => {
      const now = Date.now();
      if (key !== "action" && last.current?.key === key && now - last.current.at < COALESCE_MS) {
        last.current.at = now;
        return;
      }
      last.current = { key, at: now };
      past.current.push(structuredClone(getCurrent()));
      if (past.current.length > LIMIT) past.current.shift();
      future.current = [];
      sync();
    },
    [getCurrent],
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(structuredClone(getCurrent()));
    last.current = null;
    apply(prev);
    sync();
  }, [apply, getCurrent]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(structuredClone(getCurrent()));
    last.current = null;
    apply(next);
    sync();
  }, [apply, getCurrent]);

  return { record, undo, redo, canUndo: counts.past > 0, canRedo: counts.future > 0 };
}
