import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { canEditWorkspaces } from "@/lib/permissions";
import { WORKSPACE_TYPE_LABELS, getWorkspace } from "@/lib/workspaces";
import { CANVAS_KIND_LABELS, listCanvases, listDxwTemplates } from "@/lib/canvases";
import { TEMPLATES } from "@/lib/canvas/templates";
import { createCanvas } from "@/app/canvas-actions";
import { CreateCanvasForm } from "./create-canvas-form";
import { CanvasCardActions } from "./canvas-card-actions";

export const metadata: Metadata = { title: "Mapas" };

const dateFmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

export default async function WorkspaceHome({ params, searchParams }: PageProps<"/workspaces/[workspaceId]">) {
  const member = await getCurrentMember();
  const { workspaceId } = await params;
  const sp = await searchParams;
  const activeTag = typeof sp.tag === "string" ? sp.tag : null;

  const workspace = await getWorkspace(workspaceId);
  if (!workspace) notFound();
  const canEdit = canEditWorkspaces(member.role);
  const [canvases, dxwTemplates] = await Promise.all([listCanvases(workspace.id), canEdit ? listDxwTemplates() : Promise.resolve([])]);

  const allTags = [...new Set(canvases.flatMap((c) => c.tags))].sort();
  const visible = activeTag ? canvases.filter((c) => c.tags.includes(activeTag)) : canvases;
  const base = `/workspaces/${workspace.id}`;

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted">{WORKSPACE_TYPE_LABELS[workspace.type]}</p>
          <h1 className="text-2xl font-semibold">{workspace.name}</h1>
        </div>
        <Link href={`${base}/settings`} className="btn-secondary">Configuración</Link>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <section aria-labelledby="mapas">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 id="mapas" className="mr-2 font-semibold">Mapas</h2>
            {allTags.length > 0 && (
              <nav aria-label="Filtrar por tag" className="flex flex-wrap gap-1.5 text-xs">
                <Link href={base} className={`rounded-full px-2.5 py-1 ${!activeTag ? "bg-accent text-accent-ink" : "bg-surface text-muted hover:text-ink"}`}>
                  Todos
                </Link>
                {allTags.map((t) => (
                  <Link
                    key={t}
                    href={`${base}?tag=${encodeURIComponent(t)}`}
                    className={`rounded-full px-2.5 py-1 ${activeTag === t ? "bg-accent text-accent-ink" : "bg-surface text-muted hover:text-ink"}`}
                  >
                    {t}
                  </Link>
                ))}
              </nav>
            )}
          </div>

          {visible.length === 0 ? (
            <div className="card p-8 text-center">
              {activeTag ? (
                <>
                  <p className="font-medium">No hay mapas con el tag &quot;{activeTag}&quot;.</p>
                  <Link href={base} className="mt-2 inline-block text-sm text-accent hover:underline">Ver todos los mapas</Link>
                </>
              ) : (
                <>
                  <p className="font-medium">Todavía no hay mapas en este workspace.</p>
                  <p className="mt-1 text-sm text-muted">{canEdit ? "Crea uno desde una plantilla o en blanco." : "Un administrador o editor puede crear el primero."}</p>
                </>
              )}
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {visible.map((c) => (
                <li key={c.id} className="card flex flex-col p-4">
                  <Link href={`/canvas/${c.id}`} className="group flex-1">
                    <p className="font-medium group-hover:text-accent">
                      {c.name}
                      {c.is_template && <span className="ml-2 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-accent">Plantilla DXW</span>}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {CANVAS_KIND_LABELS[c.kind]} · {c.nodeCount} {c.nodeCount === 1 ? "elemento" : "elementos"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">Actualizado: {dateFmt.format(new Date(c.updated_at))}</p>
                    {c.tags.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-1">
                        {c.tags.map((t) => (
                          <li key={t} className="rounded-full bg-canvas px-2 py-0.5 text-[11px] text-muted">{t}</li>
                        ))}
                      </ul>
                    )}
                  </Link>
                  {canEdit && <CanvasCardActions canvasId={c.id} workspaceId={workspace.id} name={c.name} />}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="crear-mapa" className="card h-fit p-5">
          <h2 id="crear-mapa" className="font-semibold">Crear mapa</h2>
          {canEdit ? (
            <CreateCanvasForm
              action={createCanvas.bind(null, workspace.id)}
              templates={TEMPLATES}
              dxwTemplates={dxwTemplates}
              defaultTemplate={workspace.type === "internal" ? "dxw-sales-process" : "booked-call"}
            />
          ) : (
            <p className="mt-2 text-sm text-muted">Tu rol es de solo lectura. Puedes abrir y revisar los mapas.</p>
          )}
        </section>
      </div>
    </div>
  );
}
