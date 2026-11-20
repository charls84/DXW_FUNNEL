"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { ChecklistItem } from "@/lib/canvas/types";

export function ChecklistEditor({
  items,
  onChange,
  readOnly,
}: {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  readOnly?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const done = items.filter((i) => i.done).length;

  function add() {
    const text = draft.trim();
    if (!text) return;
    onChange([...items, { id: crypto.randomUUID(), text, done: false }]);
    setDraft("");
  }

  return (
    <div>
      {items.length > 0 && (
        <div className="mb-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded bg-line">
            <div className="h-full bg-success" style={{ width: `${(done / items.length) * 100}%` }} />
          </div>
          <span className="text-xs text-muted">{done}/{items.length}</span>
        </div>
      )}
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} className="group flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={item.done}
              disabled={readOnly}
              onChange={(e) => onChange(items.map((i) => (i.id === item.id ? { ...i, done: e.target.checked } : i)))}
              className="mt-1"
              aria-label={item.text}
            />
            <span className={`flex-1 ${item.done ? "text-muted line-through" : ""}`}>{item.text}</span>
            {!readOnly && (
              <button
                type="button"
                onClick={() => onChange(items.filter((i) => i.id !== item.id))}
                className="text-muted opacity-0 hover:text-danger group-hover:opacity-100"
                aria-label={`Quitar "${item.text}"`}
              >
                <X size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {!readOnly && (
        <div className="mt-2 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="Nueva tarea…"
            className="input py-1.5"
            aria-label="Nueva tarea"
          />
          <button type="button" onClick={add} className="btn-secondary py-1.5">Agregar</button>
        </div>
      )}
    </div>
  );
}
