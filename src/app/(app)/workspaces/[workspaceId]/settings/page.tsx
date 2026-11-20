import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { canDeleteWorkspaces, canEditWorkspaces } from "@/lib/permissions";
import { CURRENCIES, getWorkspace } from "@/lib/workspaces";
import { timezoneOptions } from "@/lib/timezones";
import { deleteWorkspace, updateWorkspace } from "../../../actions";
import { WorkspaceForm } from "../../../workspace-form";
import { DeleteWorkspace } from "./delete-workspace";

export const metadata: Metadata = { title: "Configuración del workspace" };

export default async function WorkspaceSettings({ params }: PageProps<"/workspaces/[workspaceId]/settings">) {
  const member = await getCurrentMember();
  const { workspaceId } = await params;
  const workspace = await getWorkspace(workspaceId);
  if (!workspace) notFound();

  const canEdit = canEditWorkspaces(member.role);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="mt-1 text-sm text-muted">{workspace.name}</p>
      </header>

      <section className="card p-6">
        <p className="mb-5 text-xs text-muted">
          ID del workspace: <code className="font-mono">{workspace.id}</code>
        </p>
        {!canEdit && (
          <p className="mb-5 text-sm text-muted">Tu rol es de solo lectura. Puedes ver la configuración, pero no cambiarla.</p>
        )}
        <WorkspaceForm
          action={updateWorkspace.bind(null, workspace.id)}
          submitLabel="Guardar cambios"
          pendingLabel="Guardando…"
          timezones={timezoneOptions()}
          currencies={CURRENCIES}
          disabled={!canEdit}
          initial={{
            name: workspace.name,
            type: workspace.type,
            main_url: workspace.main_url ?? "",
            timezone: workspace.timezone,
            currency: workspace.currency,
          }}
        />
      </section>

      {canDeleteWorkspaces(member.role) && (
        <section className="card border-danger/30 p-6">
          <h2 className="font-semibold text-danger">Eliminar workspace</h2>
          <p className="mt-1 text-sm text-muted">
            Se borran el workspace y todo lo que contenga. Esta acción no se puede deshacer.
          </p>
          <DeleteWorkspace name={workspace.name} action={deleteWorkspace.bind(null, workspace.id)} />
        </section>
      )}
    </div>
  );
}
