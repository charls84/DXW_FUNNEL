"use client";

import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import type { FlowEdgeT } from "./flow-types";
import { useForecast } from "./forecast-context";

const DASH = { direct: undefined, indirect: "7 5", visual: "2 5" } as const;

export function FlowEdge(props: EdgeProps<FlowEdgeT>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, data, selected } = props;
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const lineType = data?.lineType ?? "direct";
  const stroke = selected ? "var(--accent)" : lineType === "visual" ? "var(--muted)" : "#64748b";

  const fc = useForecast();
  const sim = fc?.settings.showLayer && lineType !== "visual" ? fc.result.edges[id] : undefined;
  const inCycle = !!fc?.result.warnings.cycleEdges.includes(id);

  return (
    <>
      <BaseEdge
        path={path}
        markerEnd={markerEnd}
        style={{ stroke, strokeWidth: selected ? 2.5 : 1.75, strokeDasharray: DASH[lineType], opacity: lineType === "visual" ? 0.7 : 1 }}
      />
      {(data?.label || sim) && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-auto absolute flex flex-col items-center gap-0.5"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {data?.label && (
              <span className="rounded border border-line bg-surface px-1.5 py-0.5 text-[11px] font-medium text-ink shadow-sm">{data.label}</span>
            )}
            {sim && fc && (
              <span
                className={`rounded px-1.5 py-0.5 text-[10.5px] font-semibold shadow-sm ${sim.rate === null || inCycle ? "border border-dashed border-line bg-surface text-muted" : "bg-accent text-accent-ink"}`}
                title={inCycle ? "Esta línea cierra un ciclo: no suma personas en la simulación." : sim.rate === null ? "Falta la tasa de conversión de esta línea." : undefined}
              >
                {sim.rate === null ? "Sin tasa" : `${fc.percent(sim.rate)}${inCycle ? "" : ` · ${fc.count(sim.people)}`}`}
              </span>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const edgeTypes = { flow: FlowEdge };
