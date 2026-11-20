import type { Metadata } from "next";
import { getCurrentMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLE_HELP, ROLE_LABELS, canManageMembers, isRole, type Role } from "@/lib/permissions";
import { getAllowedDomain } from "@/lib/env";
import { RoleSelect } from "./role-select";

export const metadata: Metadata = { title: "Equipo" };

type Row = { user_id: string; email: string; full_name: string | null; role: Role; created_at: string };

export default async function TeamPage() {
  const me = await getCurrentMember();
  const supabase = await createClient();
  const { data } = await supabase
    .from("members")
    .select("user_id, email, full_name, role, created_at")
    .order("created_at");
  const rows = ((data ?? []) as Row[]).filter((r) => isRole(r.role));
  const isAdmin = canManageMembers(me.role);
  const dateFmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" });

  return (
    <div className="mx-auto max-w-4xl">
      <header>
        <h1 className="text-2xl font-semibold">Equipo</h1>
        <p className="mt-1 text-sm text-muted">
          Cualquier persona con correo @{getAllowedDomain()} puede entrar con Google. Entra como solo lectura y
          un administrador decide su rol.
        </p>
      </header>

      <div className="card mt-8 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-canvas text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Persona</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Desde</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.user_id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">
                    {r.full_name ?? r.email}
                    {r.user_id === me.userId && <span className="ml-2 text-xs text-muted">(tú)</span>}
                  </p>
                  <p className="text-xs text-muted">{r.email}</p>
                </td>
                <td className="px-4 py-3">
                  {isAdmin ? <RoleSelect userId={r.user_id} role={r.role} /> : ROLE_LABELS[r.role]}
                </td>
                <td className="px-4 py-3 text-muted">{dateFmt.format(new Date(r.created_at))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
        {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
          <div key={role} className="card p-4">
            <dt className="font-medium">{ROLE_LABELS[role]}</dt>
            <dd className="mt-1 text-muted">{ROLE_HELP[role]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
