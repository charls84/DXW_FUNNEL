import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { canEditWorkspaces } from "@/lib/permissions";
import { WORKSPACE_TYPE_LABELS, getWorkspace } from "@/lib/workspaces";
import { CANVAS_KIND_LABELS, listCanvases, listDxwTemplates, listTrash } from "@/lib/canvases";
import { TEMPLATES } from "@/lib/canvas/templates";
import { createCanvas } from "@/app/canvas-actions";
import { CanvasPreview } from "@/components/canvas-preview";
import { CreateCanvasForm } from "./create-canvas-form";
import { CanvasCardActions } from "./canvas-card-actions";
import { TrashList } from "./trash-list";

export const metadata: Metadata = { title: "Mapas" };

const dateFmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });
const SORTS = { updated: "Última edición", name: "Nombre", created: "Más recientes" } as const;
type Sort = keyof typeof SORTS;

export default async function WorkspaceHome({ params, searchParams }: PageProps<"/workspaces/[workspaceId]">) {
  const member = await getCurrentMember();
  const { workspaceId } = await params;
  const sp = await searchParams;
  const activeTag = typeof sp.tag === "string" ? sp.tag : null;
  const sort: Sort = sp.sort === "name" || sp.sort === "created" ? sp.sort : "updated";
  const mine = sp.mine === "1";
  const protoOnly = sp.proto === "1";

  const workspace = await getWorkspace(workspaceId);
  if (!workspace) notFound();
  const canEdit = canEditWorkspaces(member.role);
  const [canvases, dxwTemplates, trash] = await Promise.all([
    listCanvases(workspace.id),
    canEdit ? listDxwTemplates() : Promise.resolve([]),
    canEdit ? listTrash(workspace.id) : Promise.resolve([]),
  ]);

  const allTags = [...new Set(canvases.flatMap((c) => c.tags))].sort();
  const visible = canvases
    .filter((c) => (!activeTag || c.tags.includes(activeTag)) && (!mine || c.created_by === member.userId) && (!protoOnly || c.mode === "prototype"))
    .sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name, "es") : sort === "created" ? b.created_at.localeCompare(a.created_at) : b.updated_at.localeCompare(a.updated_at),
    );
  const base = `/workspaces/${workspace.id}`;
  const href = (patch: Partial<{ tag: string | null; sort: Sort; mine: boolean; proto: boolean }>) => {
    const q = new URLSearchParams();
    const tag = patch.tag === undefined ? activeTag : patch.tag;
    const s = patch.sort ?? sort;
    const m = patch.mine ?? mine;
    const pr = patch.proto ?? protoOnly;
    if (tag) q.set("tag", tag);
    if (s !== "updated") q.set("sort", s);
    if (m) q.set("mine", "1");
    if (pr) q.set("proto", "1");
    const qs = q.toString();
    return qs ? `${base}?${qs}` : base;
  };
  const pill = (active: boolean) => `rounded-full px-2.5 py-1 ${active ? "bg-accent text-accent-ink" : "bg-surface text-muted hover:text-ink"}`;

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
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <h2 id="mapas" className="mr-2 text-base font-semibold">Mapas</h2>
            <nav aria-label="Ordenar" className="flex gap-1 rounded-full border border-line p-0.5">
              {(Object.keys(SORTS) as Sort[]).map((s) => (
                <Link key={s} href={href({ sort: s })} className={pill(sort === s)}>{SORTS[s]}</Link>
              ))}
            </nav>
            <Link href={href({ mine: !mine })} className={pill(mine)} aria-pressed={mine}>Mis mapas</Link>
            <Link href={href({ proto: !protoOnly })} className={pill(protoOnly)} aria-pressed={protoOnly} title="Solo los mapas en modo Prototipo">Prototipos</Link>
            {allTags.length > 0 && (
              <nav aria-label="Filtrar por tag" className="flex flex-wrap gap-1">
                {allTags.map((t) => (
                  <Link key={t} href={href({ tag: activeTag === t ? null : t })} className={pill(activeTag === t)}>#{t}</Link>
                ))}
              </nav>
            )}
          </div>

          {visible.length === 0 ? (
            <div className="card p-8 text-center">
              {activeTag || mine || protoOnly ? (
                <>
                  <p className="font-medium">No hay mapas con ese filtro.</p>
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
                <li key={c.id} className="card flex flex-col overflow-hidden">
                  <Link href={`/canvas/${c.id}`} className="group block">
                    <CanvasPreview preview={c.preview} className="w-full rounded-none border-b border-line" />
                    <div className="p-4">
                      <p className="font-medium group-hover:text-accent">
                        {c.name}
                        {c.is_template && <span className="ml-2 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-accent">Plantilla DXW</span>}
                        {c.mode === "prototype" && <span className="ml-2 rounded bg-canvas px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted">Prototipo</span>}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {CANVAS_KIND_LABELS[c.kind]} · {c.nodeCount} {c.nodeCount === 1 ? "elemento" : "elementos"} · Actualizado {dateFmt.format(new Date(c.updated_at))}
                      </p>
                      {c.tags.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-1">
                          {c.tags.map((t) => (
                            <li key={t} className="rounded-full bg-canvas px-2 py-0.5 text-[11px] text-muted">#{t}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </Link>
                  {canEdit && (
                    <div className="px-4 pb-4">
                      <CanvasCardActions canvasId={c.id} workspaceId={workspace.id} name={c.name} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {canEdit && trash.length > 0 && <TrashList items={trash.map((t) => ({ id: t.id, name: t.name, deletedAt: t.deleted_at! }))} workspaceId={workspace.id} isAdmin={member.role === "admin"} />}
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
