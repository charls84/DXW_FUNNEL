import type { EdgeForecast, ForecastSettings, StepForecast } from "@/lib/forecast/types";
import type { StepCrmMatch } from "@/lib/crm/types";

/**
 * Documento de un mapa (canvas_revisions.doc / canvases.doc).
 * Los nodos y líneas usan la forma de React Flow para guardarse y cargarse sin conversión.
 */

export type NodeCategory = "source" | "brand" | "page" | "action" | "offline" | "process" | "crm";

export type ChecklistItem = { id: string; text: string; done: boolean };

export type ProcessInfo = { owner?: string; slaHours?: number | null; tool?: string };

export type StepData = {
  catalogKey: string;          // clave del elemento en el catálogo (define ícono y color)
  category: NodeCategory;
  label: string;
  url?: string;                // páginas: dirección de la página real
  iconUrl?: string;            // ícono propio subido (reemplaza al del catálogo)
  iconSize?: IconSize;         // tamaño del ícono en el mapa (por defecto "md")
  thumbnailUrl?: string;       // páginas: captura de la página
  notes?: string;
  checklist?: ChecklistItem[];
  process?: ProcessInfo;       // mapas de proceso: responsable, SLA y herramienta
  forecast?: StepForecast;     // simulación: volumen de entrada, ingreso y meta por persona
  crm?: StepCrmMatch;          // datos reales: qué evento del CRM representa este paso
};

export type IconSize = "sm" | "md" | "lg" | "xl";

export const ICON_SIZES: Record<IconSize, { box: number; icon: number; label: string }> = {
  sm: { box: 40, icon: 18, label: "Pequeño" },
  md: { box: 56, icon: 26, label: "Normal" },
  lg: { box: 80, icon: 38, label: "Grande" },
  xl: { box: 112, icon: 54, label: "Extra grande" },
};

/**
 * Modo del mapa.
 * - "prototype": solo el flujo. Sin simulación ni datos del CRM; sirve para diseñar y guardar prototipos.
 * - "complete": flujo + simulación + datos reales.
 */
export type CanvasMode = "prototype" | "complete";

export const CANVAS_MODE_LABELS: Record<CanvasMode, string> = { prototype: "Prototipo", complete: "Completo" };
export const CANVAS_MODE_HELP: Record<CanvasMode, string> = {
  prototype: "Solo el flujo del proceso o embudo. Sin simulación ni datos del CRM.",
  complete: "Flujo con simulación y datos reales del CRM.",
};

export type WidgetData = { kind: "forecast" };

export type TextData = { text: string; size: "sm" | "md" | "lg" | "xl"; color?: string; bold?: boolean; align?: "left" | "center" | "right" };

export type ShapeData = { shape: "rect" | "ellipse" | "triangle"; label?: string; color: string };

export type ImageData = { url: string; alt?: string };

export type LineType = "direct" | "indirect" | "visual";

export type EdgeData = { lineType: LineType; label?: string; forecast?: EdgeForecast };

export type DocNode =
  | { id: string; type: "step"; position: XY; data: StepData }
  | { id: string; type: "text"; position: XY; data: TextData }
  | { id: string; type: "shape"; position: XY; data: ShapeData; width?: number; height?: number }
  | { id: string; type: "image"; position: XY; data: ImageData; width?: number; height?: number }
  | { id: string; type: "widget"; position: XY; data: WidgetData };

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
  forecast?: ForecastSettings;
  mode?: CanvasMode;           // ausente = "complete"
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
