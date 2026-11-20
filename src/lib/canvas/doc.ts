import type { CanvasDoc, ChecklistItem, DocEdge, DocNode, LineType, NodeCategory } from "./types";

const CATEGORIES: NodeCategory[] = ["source", "page", "action", "offline", "process", "crm"];
const LINE_TYPES: LineType[] = ["direct", "indirect", "visual"];
const MAX_NODES = 1000;
const MAX_EDGES = 2000;
const MAX_TEXT = 5000;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const str = (v: unknown, max = 500) => (typeof v === "string" ? v.slice(0, max) : "");
const optStr = (v: unknown, max = 500) => (typeof v === "string" && v.length ? v.slice(0, max) : undefined);

/** Solo imágenes https (Storage). En desarrollo se permiten data URLs pequeñas para la vista de prueba. */
export function safeImageUrl(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  if (/^https:\/\/[^\s"'<>]+$/i.test(v) && v.length <= 1000) return v;
  if (process.env.NODE_ENV !== "production" && /^data:image\/(png|jpeg|webp|gif);base64,/i.test(v) && v.length <= 400_000) return v;
  return undefined;
}

function checklist(v: unknown): ChecklistItem[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v
    .filter(isObj)
    .slice(0, 200)
    .map((i) => ({ id: str(i.id, 64) || crypto.randomUUID(), text: str(i.text, 300), done: i.done === true }));
}

function node(v: unknown): DocNode | null {
  if (!isObj(v) || typeof v.id !== "string" || !isObj(v.data)) return null;
  const position = isObj(v.position) ? { x: num(v.position.x), y: num(v.position.y) } : { x: 0, y: 0 };
  const d = v.data;
  const id = v.id.slice(0, 64);

  if (v.type === "step") {
    const category = CATEGORIES.includes(d.category as NodeCategory) ? (d.category as NodeCategory) : "page";
    const process = isObj(d.process)
      ? {
          owner: optStr(d.process.owner, 120),
          slaHours: typeof d.process.slaHours === "number" && d.process.slaHours >= 0 ? d.process.slaHours : null,
          tool: optStr(d.process.tool, 120),
        }
      : undefined;
    return {
      id,
      type: "step",
      position,
      data: {
        catalogKey: str(d.catalogKey, 64) || "generic",
        category,
        label: str(d.label, 120),
        url: optStr(d.url, 500),
        iconUrl: safeImageUrl(d.iconUrl),
        thumbnailUrl: safeImageUrl(d.thumbnailUrl),
        notes: optStr(d.notes, MAX_TEXT),
        checklist: checklist(d.checklist),
        process,
      },
    };
  }
  if (v.type === "text") {
    const size = ["sm", "md", "lg", "xl"].includes(d.size as string) ? (d.size as "sm" | "md" | "lg" | "xl") : "md";
    return { id, type: "text", position, data: { text: str(d.text, 1000), size } };
  }
  if (v.type === "shape") {
    return {
      id,
      type: "shape",
      position,
      width: num(v.width, 240),
      height: num(v.height, 160),
      data: {
        shape: d.shape === "ellipse" ? "ellipse" : "rect",
        label: optStr(d.label, 120),
        color: /^#[0-9a-f]{6}$/i.test(str(d.color)) ? str(d.color) : "#1d5bd6",
      },
    };
  }
  if (v.type === "image") {
    const url = safeImageUrl(d.url);
    if (!url) return null;
    return { id, type: "image", position, width: num(v.width, 240), height: num(v.height, 160), data: { url, alt: optStr(d.alt, 200) } };
  }
  return null;
}

function edge(v: unknown, nodeIds: Set<string>): DocEdge | null {
  if (!isObj(v) || typeof v.id !== "string") return null;
  const source = str(v.source, 64);
  const target = str(v.target, 64);
  if (!nodeIds.has(source) || !nodeIds.has(target)) return null;
  const d = isObj(v.data) ? v.data : {};
  return {
    id: v.id.slice(0, 64),
    source,
    target,
    sourceHandle: typeof v.sourceHandle === "string" ? v.sourceHandle.slice(0, 32) : null,
    targetHandle: typeof v.targetHandle === "string" ? v.targetHandle.slice(0, 32) : null,
    type: "flow",
    data: {
      lineType: LINE_TYPES.includes(d.lineType as LineType) ? (d.lineType as LineType) : "direct",
      label: optStr(d.label, 80),
    },
  };
}

/** Limpia y valida un documento recibido del cliente o de la base de datos. Nunca lanza. */
export function sanitizeDoc(input: unknown): CanvasDoc {
  const src = isObj(input) ? input : {};
  const nodes = (Array.isArray(src.nodes) ? src.nodes : []).slice(0, MAX_NODES).map(node).filter((n): n is DocNode => !!n);
  const ids = new Set(nodes.map((n) => n.id));
  const edges = (Array.isArray(src.edges) ? src.edges : []).slice(0, MAX_EDGES).map((e) => edge(e, ids)).filter((e): e is DocEdge => !!e);
  const vp = isObj(src.viewport) ? { x: num(src.viewport.x), y: num(src.viewport.y), zoom: num(src.viewport.zoom, 1) } : undefined;

  return {
    schema: 1,
    nodes,
    edges,
    notes: optStr(src.notes, MAX_TEXT),
    checklist: checklist(src.checklist),
    viewport: vp,
  };
}
