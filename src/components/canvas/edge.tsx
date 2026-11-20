"use client";

import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import type { FlowEdgeT } from "./flow-types";

const DASH = { direct: undefined, indirect: "7 5", visual: "2 5" } as const;

export function FlowEdge(props: EdgeProps<FlowEdgeT>) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, data, selected } = props;
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const lineType = data?.lineType ?? "direct";
  const stroke = selected ? "var(--accent)" : lineType === "visual" ? "var(--muted)" : "#64748b";

  return (
    <>
      <BaseEdge
        path={path}
        markerEnd={markerEnd}
        style={{ stroke, strokeWidth: selected ? 2.5 : 1.75, strokeDasharray: DASH[lineType], opacity: lineType === "visual" ? 0.7 : 1 }}
      />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-auto absolute rounded border border-line bg-surface px-1.5 py-0.5 text-[11px] font-medium text-ink shadow-sm"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const edgeTypes = { flow: FlowEdge };
