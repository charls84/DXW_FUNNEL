import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { canEditWorkspaces, canManageMembers } from "@/lib/permissions";
import { getWorkspace } from "@/lib/workspaces";
import { createCrmConnection, deleteAllCrmEvents, deleteCrmConnection, getCrmConnection, getCrmStatus, importCrmCsv, rotateCrmSecret } from "@/app/crm-actions";
import { CRM_EVENT_LABELS, CRM_EVENT_TYPES } from "@/lib/crm/types";
import { ConnectionPanel } from "./connection-panel";
import { CsvImport } from "./csv-import";
import { DeleteEvents } from "./delete-events";

export const metadata: Metadata = { title: "CRM" };

const fmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

export default async function CrmPage({ params }: PageProps<"/workspaces/[workspaceId]/crm">) {
  const member = await getCurrentMember();
  const { workspaceId } = await params;
  const workspace = await getWorkspace(workspaceId);
  if (!workspace) notFound();

  const isAdmin = canManageMembers(member.role);
  const [status, connection] = await Promise.all([getCrmStatus(workspace.id), isAdmin ? getCrmConnection(workspace.id) : Promise.resolve(null)]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">CRM</h1>
        <p className="mt-1 text-sm text-muted">
          Conecta el CRM de DXW para ver en los mapas cuántos contactos pasan realmente por cada etapa, cuánto tardan y si cumplen el SLA.
        </p>
      </header>

      <section className="card p-6">
        <h2 className="font-semibold">Estado</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted">Webhook</dt>
            <dd className="font-medium">{status.connected ? "Conectado" : "Sin conectar"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Último evento recibido</dt>
            <dd className="font-medium">{status.lastEventAt ? fmt.format(new Date(status.lastEventAt)) : "Todavía ninguno"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Eventos guardados</dt>
            <dd className="font-medium">{new Intl.NumberFormat("es-CO").format(status.eventsStored)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-muted">
          Siguiente paso: en cada mapa, selecciona un paso y elige en &quot;Datos reales (CRM)&quot; qué evento lo representa. Luego cambia la vista a
          &quot;Real&quot; o &quot;Comparar&quot;.
        </p>
      </section>

      <section className="card p-6">
        <h2 className="font-semibold">Conexión por webhook</h2>
        <p className="mt-1 text-sm text-muted">El CRM envía un evento cada vez que algo cambia. DXW Funnel verifica la firma y lo guarda.</p>
        {isAdmin ? (
          <ConnectionPanel
            connection={connection}
            create={createCrmConnection.bind(null, workspace.id)}
            rotate={rotateCrmSecret.bind(null, workspace.id)}
            remove={deleteCrmConnection.bind(null, workspace.id)}
          />
        ) : (
          <p className="mt-3 text-sm text-muted">Solo un administrador puede ver la clave y el secreto de la conexión.</p>
        )}
      </section>

      <section className="card p-6">
        <h2 className="font-semibold">Importar histórico (CSV)</h2>
        <p className="mt-1 text-sm text-muted">
          Sube eventos anteriores para tener datos desde el primer día. Los eventos con un id ya importado se ignoran, así que puedes subir el mismo archivo otra vez sin duplicar.
        </p>
        {canEditWorkspaces(member.role) ? (
          <CsvImport importRows={importCrmCsv.bind(null, workspace.id)} />
        ) : (
          <p className="mt-3 text-sm text-muted">Tu rol es de solo lectura.</p>
        )}
      </section>

      <section className="card p-6">
        <h2 className="font-semibold">Tipos de evento</h2>
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-1 font-medium">type</th>
              <th className="py-1 font-medium">Significado</th>
            </tr>
          </thead>
          <tbody>
            {CRM_EVENT_TYPES.map((t) => (
              <tr key={t} className="border-t border-line">
                <td className="py-1.5 font-mono text-xs">{t}</td>
                <td className="py-1.5">
                  {CRM_EVENT_LABELS[t]}
                  {t === "stage_changed" && " (requiere stage)"}
                  {(t === "deal_won" || t === "payment") && " (value suma a ingresos)"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted">
          Privacidad: del email solo se guarda su hash SHA-256 (para unir el CRM con la web más adelante). Nunca se guarda el email.
        </p>
      </section>

      {isAdmin && status.eventsStored > 0 && (
        <section className="card border-danger/30 p-6">
          <h2 className="font-semibold text-danger">Borrar eventos</h2>
          <p className="mt-1 text-sm text-muted">Elimina todos los eventos del CRM de este workspace. Los mapas no cambian, pero se pierden los datos reales. No se puede deshacer.</p>
          <DeleteEvents action={deleteAllCrmEvents.bind(null, workspace.id)} />
        </section>
      )}
    </div>
  );
}
