"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function DeleteEvents({ action }: { action: (confirmText: string) => Promise<{ ok: boolean; error?: string }> }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="mt-4 space-y-2">
      <label htmlFor="confirm-delete-events" className="field-label">Escribe BORRAR para confirmar</label>
      <input id="confirm-delete-events" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" className="input" />
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button
        type="button"
        disabled={pending || text !== "BORRAR"}
        onClick={() =>
          start(async () => {
            const r = await action(text);
            if (!r.ok) setError(r.error ?? "No pudimos borrar los eventos.");
            else {
              setText("");
              router.refresh();
            }
          })
        }
        className="btn-danger"
      >
        {pending ? "Borrando…" : "Borrar todos los eventos"}
      </button>
    </div>
  );
}
