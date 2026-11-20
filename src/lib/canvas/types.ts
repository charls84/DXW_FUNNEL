/**
 * Documento de un mapa (canvas_revisions.doc / canvases.doc).
 * Los nodos y líneas usan la forma de React Flow para guardarse y cargarse sin conversión.
 */

export type NodeCategory = "source" | "page" | "action" | "offline" | "process" | "crm";

export type ChecklistItem = { id: string; text: string; done: boolean };

export type ProcessInfo = { owner?: string; slaHours?: number | null; tool?: string };

export type StepData = {
  catalogKey: string;          // clave del elemento en el catálogo (define ícono y color)
  category: NodeCategory;
  label: string;
  url?: string;                // páginas: dirección de la página real
  iconUrl?: string;            // ícono propio subido (reemplaza al del catálogo)
  thumbnailUrl?: string;       // páginas: captura de la página
  notes?: string;
  checklist?: ChecklistItem[];
  process?: ProcessInfo;       // mapas de proceso: responsable, SLA y herramienta
};

export type TextData = { text: string; size: "sm" | "md" | "lg" | "xl" };

export type ShapeData = { shape: "rect" | "ellipse"; label?: string; color: string };

export type ImageData = { url: string; alt?: string };

export type LineType = "direct" | "indirect" | "visual";

export type EdgeData = { lineType: LineType; label?: string };

export type DocNode =
  | { id: string; type: "step"; position: XY; data: StepData }
  | { id: string; type: "text"; position: XY; data: TextData }
  | { id: string; type: "shape"; position: XY; data: ShapeData; width?: number; height?: number }
  | { id: string; type: "image"; position: XY; data: ImageData; width?: number; height?: number };

export type DocEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type: "flow";
  data: EdgeData;
};

export type XY = { x: number; y: number };

export type CanvasDoc = {
  schema: 1;
  nodes: DocNode[];
  edges: DocEdge[];
  notes?: string;
  checklist?: ChecklistItem[];
  viewport?: { x: number; y: number; zoom: number };
};

export const EMPTY_DOC: CanvasDoc = { schema: 1, nodes: [], edges: [] };

export const LINE_TYPE_LABELS: Record<LineType, string> = {
  direct: "Directa",
  indirect: "Indirecta",
  visual: "Solo visual",
};

export const LINE_TYPE_HELP: Record<LineType, string> = {
  direct: "La persona pasa al siguiente paso de inmediato.",
  indirect: "La persona llega al siguiente paso más adelante, aunque haya pasos en medio.",
  visual: "Solo dibuja la relación; no se usa para medir ni simular.",
};
