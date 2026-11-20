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
  const view = fc?.settings.view ?? "forecast";
  const show = !!fc?.settings.showLayer && lineType !== "visual";
  const sim = show && view !== "actual" ? fc!.result.edges[id] : undefined;
  const real = show && view !== "forecast" ? fc!.actual?.edges[id] : undefined;
  const inCycle = !!fc?.result.warnings.cycleEdges.includes(id);

  let realText: string | null = null;
  if (show && view !== "forecast" && fc) {
    if (!real) realText = view === "actual" ? "Sin datos" : null;
    else {
      const days = real.medianDays === null ? "" : ` · ${real.medianDays < 1 ? "<1" : real.medianDays.toLocaleString("es-CO", { maximumFractionDigits: 1 })} d`;
      realText = `${view === "compare" ? "Real " : ""}${fc.percent(real.rate)}${view === "actual" ? ` · ${fc.count(real.people)}${days}` : ""}`;
    }
  }
  const showSim = sim && view !== "actual";
  const animate = !!fc?.settings.animateFlow && lineType !== "visual";

  return (
    <>
      <BaseEdge
        path={path}
        markerEnd={markerEnd}
        className={animate ? "dxw-flow-anim" : undefined}
        style={{ stroke, strokeWidth: selected ? 2.5 : 1.75, strokeDasharray: animate && lineType === "direct" ? "6 4" : DASH[lineType], opacity: lineType === "visual" ? 0.7 : 1 }}
      />
      {(data?.label || showSim || realText) && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-auto absolute flex flex-col items-center gap-0.5"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {data?.label && (
              <span className="rounded border border-line bg-surface px-1.5 py-0.5 text-[11px] font-medium text-ink shadow-sm">{data.label}</span>
            )}
            {showSim && sim && fc && (
              <span
                className={`rounded px-1.5 py-0.5 text-[10.5px] font-semibold shadow-sm ${sim.rate === null || inCycle ? "border border-dashed border-line bg-surface text-muted" : "bg-accent text-accent-ink"}`}
                title={inCycle ? "Esta línea cierra un ciclo: no suma personas en la simulación." : sim.rate === null ? "Falta la tasa de conversión de esta línea." : undefined}
              >
                {sim.rate === null ? "Sin tasa" : `${view === "compare" ? "Sim. " : ""}${fc.percent(sim.rate)}${inCycle || view === "compare" ? "" : ` · ${fc.count(sim.people)}`}`}
              </span>
            )}
            {realText && (
              <span
                className={`rounded px-1.5 py-0.5 text-[10.5px] font-semibold shadow-sm ${real ? "bg-success text-white" : "border border-dashed border-line bg-surface text-muted"}`}
                title={real ? "Tasa real: contactos que llegaron al paso anterior y luego a este, en el período." : "Conecta ambos pasos al CRM para ver datos reales."}
              >
                {realText}
              </span>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const edgeTypes = { flow: FlowEdge };
