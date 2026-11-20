"use client";

import { useState } from "react";
import { X } from "lucide-react";

export const MAX_TAGS = 10;

export function normalizeTag(t: string) {
  return t.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 30);
}

export function TagsEditor({ tags, onChange, readOnly }: { tags: string[]; onChange: (tags: string[]) => void; readOnly?: boolean }) {
  const [draft, setDraft] = useState("");

  function add() {
    const t = normalizeTag(draft);
    setDraft("");
    if (!t || tags.includes(t) || tags.length >= MAX_TAGS) return;
    onChange([...tags, t]);
  }

  return (
    <div>
      <ul className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <li key={t} className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
            {t}
            {!readOnly && (
              <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} aria-label={`Quitar tag ${t}`} className="hover:text-danger">
                <X size={12} />
              </button>
            )}
          </li>
        ))}
        {tags.length === 0 && <li className="text-xs text-muted">Sin tags.</li>}
      </ul>
      {!readOnly && tags.length < MAX_TAGS && (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
          placeholder="Agregar tag y Enter"
          className="input mt-2 py-1.5"
          aria-label="Nuevo tag"
          maxLength={30}
        />
      )}
    </div>
  );
}
