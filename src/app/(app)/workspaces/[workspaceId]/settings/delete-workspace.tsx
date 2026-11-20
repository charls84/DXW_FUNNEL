"use client";

import { useActionState, useState } from "react";
import type { FormState } from "../../../actions";

export function DeleteWorkspace({
  name,
  action,
}: {
  name: string;
  action: (prev: FormState, form: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [typed, setTyped] = useState("");

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <div>
        <label htmlFor="confirm_name" className="field-label">
          Escribe <span className="font-mono">{name}</span> para confirmar
        </label>
        <input
          id="confirm_name"
          name="confirm_name"
          autoComplete="off"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className="input"
        />
      </div>
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <button type="submit" className="btn-danger" disabled={pending || typed.trim() !== name}>
        {pending ? "Eliminando…" : "Eliminar workspace"}
      </button>
    </form>
  );
}
