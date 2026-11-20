import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type { CanvasDoc, DocEdge, DocNode, EdgeData, ImageData, ShapeData, StepData, TextData, WidgetData } from "@/lib/canvas/types";

export type StepNodeT = Node<StepData, "step">;
export type TextNodeT = Node<TextData, "text">;
export type ShapeNodeT = Node<ShapeData, "shape">;
export type ImageNodeT = Node<ImageData, "image">;
export type WidgetNodeT = Node<WidgetData, "widget">;
export type AppNode = StepNodeT | TextNodeT | ShapeNodeT | ImageNodeT | WidgetNodeT;
export type FlowEdgeT = Edge<EdgeData, "flow">;

export const EDGE_MARKER = { type: MarkerType.ArrowClosed, width: 18, height: 18 } as const;

/** Documento guardado → nodos y líneas de React Flow. */
export function docToFlow(doc: CanvasDoc): { nodes: AppNode[]; edges: FlowEdgeT[] } {
  const nodes = doc.nodes.map((n): AppNode => {
    if (n.type === "shape") {
      return { ...n, width: n.width ?? 240, height: n.height ?? 160, zIndex: -1 } as ShapeNodeT;
    }
    if (n.type === "image") {
      return { ...n, width: n.width ?? 240, height: n.height ?? 160 } as ImageNodeT;
    }
    return { ...n } as AppNode;
  });
  const edges = doc.edges.map((e): FlowEdgeT => ({ ...e, type: "flow", markerEnd: EDGE_MARKER }));
  return { nodes, edges };
}

/** Nodos y líneas de React Flow → documento para guardar (sin estado de selección ni medidas). */
export function flowToDoc(
  nodes: AppNode[],
  edges: FlowEdgeT[],
  extra: Pick<CanvasDoc, "notes" | "checklist" | "viewport" | "forecast">,
): CanvasDoc {
  const docNodes = nodes.map((n): DocNode => {
    const position = { x: Math.round(n.position.x), y: Math.round(n.position.y) };
    if (n.type === "shape") {
      return {
        id: n.id,
        type: "shape",
        position,
        data: n.data,
        width: Math.round(n.width ?? n.measured?.width ?? 240),
        height: Math.round(n.height ?? n.measured?.height ?? 160),
      };
    }
    if (n.type === "image") {
      return {
        id: n.id,
        type: "image",
        position,
        data: n.data,
        width: Math.round(n.width ?? n.measured?.width ?? 240),
        height: Math.round(n.height ?? n.measured?.height ?? 160),
      };
    }
    if (n.type === "widget") return { id: n.id, type: "widget", position, data: { kind: "forecast" } };
    if (n.type === "text") return { id: n.id, type: "text", position, data: n.data };
    return { id: n.id, type: "step", position, data: n.data };
  });
  const docEdges = edges.map(
    (e): DocEdge => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
      type: "flow",
      data: e.data ?? { lineType: "direct" },
    }),
  );
  return { schema: 1, nodes: docNodes, edges: docEdges, ...extra };
}
