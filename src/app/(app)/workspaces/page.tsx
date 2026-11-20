import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentMember } from "@/lib/auth";
import { canEditWorkspaces } from "@/lib/permissions";
import { CURRENCIES, WORKSPACE_TYPE_LABELS, listWorkspaces } from "@/lib/workspaces";
import { timezoneOptions } from "@/lib/timezones";
import { createWorkspace } from "../actions";
import { WorkspaceForm } from "../workspace-form";

export const metadata: Metadata = { title: "Workspaces" };

export default async function WorkspacesPage() {
  const member = await getCurrentMember();
  const workspaces = await listWorkspaces();
  const canCreate = canEditWorkspaces(member.role);

  return (
    <div className="mx-auto max-w-5xl">
      <header>
        <h1 className="text-2xl font-semibold">Workspaces</h1>
        <p className="mt-1 text-sm text-muted">
          Un workspace agrupa los mapas de un cliente o de un proceso interno de DXW.
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <section aria-labelledby="lista">
          <h2 id="lista" className="sr-only">Lista de workspaces</h2>
          {workspaces.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="font-medium">Todavía no hay workspaces.</p>
              <p className="mt-1 text-sm text-muted">
                {canCreate
                  ? "Crea el primero para empezar a mapear. Te sugerimos \"Proceso comercial DXW\"."
                  : "Un administrador o editor puede crear el primero."}
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {workspaces.map((w) => (
                <li key={w.id}>
                  <Link href={`/workspaces/${w.id}`} className="card block p-4 hover:border-accent">
                    <p className="font-medium">{w.name}</p>
                    <p className="mt-1 text-xs text-muted">
                      {WORKSPACE_TYPE_LABELS[w.type]}
                      {w.main_url ? ` · ${w.main_url}` : ""} · {w.currency}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="crear" className="card h-fit p-5">
          <h2 id="crear" className="font-semibold">Crear workspace</h2>
          {canCreate ? (
            <div className="mt-4">
              <WorkspaceForm
                action={createWorkspace}
                submitLabel="Crear workspace"
                pendingLabel="Creando…"
                timezones={timezoneOptions()}
                currencies={CURRENCIES}
              />
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">Tu rol es de solo lectura. Un administrador puede cambiarlo en Equipo.</p>
          )}
        </section>
      </div>
    </div>
  );
}
