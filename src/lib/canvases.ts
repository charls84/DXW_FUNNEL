import "server-only";
import { createClient } from "@/lib/supabase/server";
import { sanitizeDoc } from "@/lib/canvas/doc";
import type { CanvasDoc } from "@/lib/canvas/types";

export type CanvasSummary = {
  id: string;
  workspace_id: string;
  name: string;
  kind: "funnel" | "process";
  tags: string[];
  is_template: boolean;
  updated_at: string;
  nodeCount: number;
};

export type CanvasFull = CanvasSummary & { doc: CanvasDoc; version: number };

export type DxwTemplate = { id: string; name: string; kind: "funnel" | "process"; workspaceName: string; nodeCount: number };

export const CANVAS_KIND_LABELS = { funnel: "Embudo", process: "Proceso" } as const;

/** RLS limita a miembros del equipo. Llamar después de getCurrentMember(). */
export async function listCanvases(workspaceId: string): Promise<CanvasSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("canvases")
    .select("id, workspace_id, name, kind, tags, is_template, updated_at, doc->nodes")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`No se pudieron cargar los mapas: ${error.message}`);
  return (data ?? []).map((c) => ({
    id: c.id,
    workspace_id: c.workspace_id,
    name: c.name,
    kind: c.kind,
    tags: c.tags ?? [],
    is_template: c.is_template === true,
    updated_at: c.updated_at,
    nodeCount: Array.isArray(c.nodes) ? c.nodes.length : 0,
  }));
}

/** Mapas marcados como "plantilla de DXW" en cualquier workspace. */
export async function listDxwTemplates(): Promise<DxwTemplate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("canvases")
    .select("id, name, kind, doc->nodes, workspaces(name)")
    .eq("is_template", true)
    .order("name")
    .limit(100);
  return (data ?? []).map((c) => {
    const ws = Array.isArray(c.workspaces) ? c.workspaces[0] : c.workspaces;
    return {
      id: c.id,
      name: c.name,
      kind: c.kind,
      workspaceName: (ws as { name?: string } | null)?.name ?? "",
      nodeCount: Array.isArray(c.nodes) ? c.nodes.length : 0,
    };
  });
}

export async function getCanvas(id: string): Promise<CanvasFull | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("canvases")
    .select("id, workspace_id, name, kind, tags, is_template, updated_at, doc, version")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const doc = sanitizeDoc(data.doc);
  return {
    id: data.id,
    workspace_id: data.workspace_id,
    name: data.name,
    kind: data.kind,
    tags: data.tags ?? [],
    is_template: data.is_template === true,
    updated_at: data.updated_at,
    doc,
    version: data.version,
    nodeCount: doc.nodes.length,
  };
}
