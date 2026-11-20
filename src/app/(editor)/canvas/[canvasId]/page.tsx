import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { canEditWorkspaces } from "@/lib/permissions";
import { getCanvas } from "@/lib/canvases";
import { getSupabaseEnv } from "@/lib/env";
import {
  addCustomIcon,
  createRevision,
  createShareLink,
  deleteCustomIcon,
  listCustomIcons,
  listRevisions,
  listShareLinks,
  renameCanvas,
  restoreRevision,
  revokeShareLink,
  saveCanvas,
  setCanvasTags,
  setCanvasTemplate,
} from "@/app/canvas-actions";
import { CanvasPageClient } from "@/components/canvas/canvas-page-client";

export const metadata: Metadata = { title: "Mapa" };

export default async function CanvasPage({ params }: PageProps<"/canvas/[canvasId]">) {
  const member = await getCurrentMember();
  const { canvasId } = await params;
  const canvas = await getCanvas(canvasId);
  const env = getSupabaseEnv();
  if (!canvas || !env) notFound();

  const id = canvas.id;
  const ws = canvas.workspace_id;

  return (
    <CanvasPageClient
      workspaceId={ws}
      name={canvas.name}
      doc={canvas.doc}
      version={canvas.version}
      readOnly={!canEditWorkspaces(member.role)}
      tags={canvas.tags}
      isTemplate={canvas.is_template}
      supabase={env}
      server={{
        save: saveCanvas.bind(null, id),
        rename: renameCanvas.bind(null, id),
        listRevisions: listRevisions.bind(null, id),
        createRevision: createRevision.bind(null, id),
        restoreRevision: restoreRevision.bind(null, id),
        setTags: setCanvasTags.bind(null, id),
        setTemplate: setCanvasTemplate.bind(null, id),
        listShareLinks: listShareLinks.bind(null, id),
        createShareLink: createShareLink.bind(null, id),
        revokeShareLink: revokeShareLink.bind(null, id),
        listIcons: listCustomIcons.bind(null, ws),
        addIcon: addCustomIcon.bind(null, ws),
        deleteIcon: deleteCustomIcon.bind(null, ws),
      }}
    />
  );
}
