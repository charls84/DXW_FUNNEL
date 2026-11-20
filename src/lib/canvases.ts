import "server-only";
import { createClient } from "@/lib/supabase/server";
import { sanitizeDoc } from "@/lib/canvas/doc";
import type { CanvasDoc } from "@/lib/canvas/types";

export type PreviewNode = { x: number; y: number; type: string; category?: string; w?: number; h?: number };
export type PreviewEdge = { s: number; t: number };

export type CanvasSummary = {
  id: string;
  workspace_id: string;
  name: string;
  kind: "funnel" | "process";
  tags: string[];
  is_template: boolean;
  updated_at: string;
  created_at: string;
  created_by: string | null;
  deleted_at: string | null;
  mode: "prototype" | "complete";
  nodeCount: number;
  preview: { nodes: PreviewNode[]; edges: PreviewEdge[] };
};

/** Vista previa liviana: posiciones y categorías, sin textos ni datos. */
export function previewOf(doc: unknown): CanvasSummary["preview"] {
  const d = (doc ?? {}) as { nodes?: unknown[]; edges?: unknown[] };
  const nodes = (Array.isArray(d.nodes) ? d.nodes : []) as { id?: string; type?: string; position?: { x?: number; y?: number }; width?: number; height?: number; data?: { category?: string } }[];
  const index = new Map<string, number>();
  const out: PreviewNode[] = [];
  for (const nd of nodes) {
    if (!nd || typeof nd.id !== "string" || !nd.position) continue;
    index.set(nd.id, out.length);
    out.push({ x: Number(nd.position.x) || 0, y: Number(nd.position.y) || 0, type: String(nd.type ?? "step"), category: nd.data?.category, w: nd.width, h: nd.height });
  }
  const edges = ((Array.isArray(d.edges) ? d.edges : []) as { source?: string; target?: string }[])
    .filter((e) => e && index.has(String(e.source)) && index.has(String(e.target)))
    .map((e) => ({ s: index.get(String(e.source))!, t: index.get(String(e.target))! }));
  return { nodes: out.slice(0, 300), edges: edges.slice(0, 600) };
}

export type CanvasFull = CanvasSummary & { doc: CanvasDoc; version: number };

export type DxwTemplate = { id: string; name: string; kind: "funnel" | "process"; workspaceName: string; nodeCount: number };

export const CANVAS_KIND_LABELS = { funnel: "Embudo", process: "Proceso" } as const;

/** RLS limita a miembros del equipo. Llamar después de getCurrentMember(). */
export async function listCanvases(workspaceId: string): Promise<CanvasSummary[]> {
  return listCanvasesWhere(workspaceId, false);
}

/** Mapas en la papelera (eliminados hace menos de 30 días). */
export async function listTrash(workspaceId: string): Promise<CanvasSummary[]> {
  return listCanvasesWhere(workspaceId, true);
}

async function listCanvasesWhere(workspaceId: string, deleted: boolean): Promise<CanvasSummary[]> {
  const supabase = await createClient();
  let q = supabase
    .from("canvases")
    .select("id, workspace_id, name, kind, tags, is_template, updated_at, created_at, created_by, deleted_at, doc")
    .eq("workspace_id", workspaceId);
  q = deleted ? q.not("deleted_at", "is", null).order("deleted_at", { ascending: false }) : q.is("deleted_at", null).order("updated_at", { ascending: false });
  const { data, error } = await q;
  if (error) throw new Error(`No se pudieron cargar los mapas: ${error.message}`);
  return (data ?? []).map((c) => {
    const preview = previewOf(c.doc);
    return {
      id: c.id,
      workspace_id: c.workspace_id,
      name: c.name,
      kind: c.kind,
      tags: c.tags ?? [],
      is_template: c.is_template === true,
      updated_at: c.updated_at,
      created_at: c.created_at,
      created_by: c.created_by ?? null,
      deleted_at: c.deleted_at ?? null,
      mode: (c.doc as { mode?: unknown } | null)?.mode === "prototype" ? "prototype" : "complete",
      nodeCount: preview.nodes.length,
      preview,
    };
  });
}

/** Mapas marcados como "plantilla de DXW" en cualquier workspace. */
export async function listDxwTemplates(): Promise<DxwTemplate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("canvases")
    .select("id, name, kind, doc->nodes, workspaces(name)")
    .eq("is_template", true)
    .is("deleted_at", null)
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
    .select("id, workspace_id, name, kind, tags, is_template, updated_at, created_at, created_by, deleted_at, doc, version")
    .eq("id", id)
    .is("deleted_at", null)
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
    created_at: data.created_at,
    created_by: data.created_by ?? null,
    deleted_at: null,
    mode: doc.mode ?? "complete",
    doc,
    version: data.version,
    nodeCount: doc.nodes.length,
    preview: previewOf(data.doc),
  };
}
