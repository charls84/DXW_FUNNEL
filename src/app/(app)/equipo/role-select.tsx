"use client";

import { useActionState } from "react";
import { updateMemberRole } from "../actions";
import { ROLE_LABELS, type Role } from "@/lib/permissions";

export function RoleSelect({ userId, role }: { userId: string; role: Role }) {
  const [state, formAction, pending] = useActionState(updateMemberRole, null);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <label className="sr-only" htmlFor={`role-${userId}`}>Rol</label>
      <select id={`role-${userId}`} name="role" defaultValue={role} className="input w-auto py-1.5" disabled={pending}>
        {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
        ))}
      </select>
      <button type="submit" className="btn-secondary py-1.5" disabled={pending}>
        {pending ? "Guardando…" : "Cambiar rol"}
      </button>
      {state?.error && <p role="alert" className="w-full text-xs text-danger">{state.error}</p>}
      {state?.success && <p role="status" className="w-full text-xs text-success">{state.success}</p>}
    </form>
  );
}
