"use client";

import { memo } from "react";
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
import { ListChecks, StickyNote } from "lucide-react";
import { getCatalogItem, stepColors } from "@/lib/canvas/catalog";
import { ICON_SIZES } from "@/lib/canvas/types";
import type { ImageNodeT, ShapeNodeT, StepNodeT, TextNodeT } from "./flow-types";
import { delta, deltaTone, useForecast } from "./forecast-context";
import { ForecastWidgetNode } from "./forecast-widget";

const HANDLES: { id: string; position: Position }[] = [
  { id: "t", position: Position.Top },
  { id: "r", position: Position.Right },
  { id: "b", position: Position.Bottom },
  { id: "l", position: Position.Left },
];

function Handles() {
  return (
    <>
      {HANDLES.map((h) => (
        <Handle key={h.id} id={h.id} type="source" position={h.position} className="dxw-handle" />
      ))}
    </>
  );
}

const TONE = { good: "text-success", bad: "text-danger", neutral: "text-muted" } as const;

/** Números bajo cada paso: simulación, datos reales del CRM o la comparación de ambos. */
function StepForecastBadge({ id, mapped }: { id: string; mapped: boolean }) {
  const fc = useForecast();
  if (!fc || !fc.settings.showLayer) return null;
  const sim = fc.result.steps[id];
  const real = fc.actual?.steps[id];
  const view = fc.settings.view;
  const box = "mt-1 flex flex-col items-center gap-0.5 rounded-md border border-line bg-surface px-2 py-1 text-[10.5px] leading-tight shadow-sm";

  if (view === "forecast") {
    if (!sim) return null;
    return (
      <div className={box}>
        <span className="font-semibold text-ink">{fc.count(sim.people)} personas</span>
        {sim.cost > 0 && <span className="text-danger">Gasto {fc.money(sim.cost)}</span>}
        {sim.revenue > 0 && <span className="text-success">Ingresos {fc.money(sim.revenue)}</span>}
        {sim.goalValue > 0 && <span className="text-muted">Meta {fc.money(sim.goalValue)}</span>}
      </div>
    );
  }

  if (!mapped) return <div className={`${box} text-muted`}>Sin conexión al CRM</div>;
  if (!real) return fc.crm.loading ? <div className={`${box} text-muted`}>Cargando…</div> : null;

  const sla =
    real.avgHoursInStep !== null
      ? `${real.avgHoursInStep >= 48 ? `${(real.avgHoursInStep / 24).toLocaleString("es-CO", { maximumFractionDigits: 1 })} d` : `${Math.round(real.avgHoursInStep)} h`} en el paso`
      : null;

  if (view === "actual") {
    const prev = fc.previous?.steps[id];
    const trend = prev ? delta(real.people, prev.people) : null;
    return (
      <div className={box}>
        <span className="font-semibold text-ink">
          {fc.count(real.people)} reales
          {trend !== null && (
            <span className={`ml-1 ${TONE[deltaTone(trend)]}`} title="Frente al período anterior">
              {trend >= 0 ? "▲" : "▼"} {Math.abs(Math.round(trend * 100))} %
            </span>
          )}
        </span>
        {real.revenue > 0 && <span className="text-success">Ingresos {fc.money(real.revenue)}</span>}
        {sla && <span className="text-muted">{sla}</span>}
        {real.overSla > 0 && <span className="text-danger">{real.overSla} fuera de SLA</span>}
      </div>
    );
  }

  const d = sim ? delta(real.people, sim.people) : null;
  return (
    <div className={box}>
      <span className="text-muted">Sim. {sim ? fc.count(sim.people) : "—"}</span>
      <span className="font-semibold text-ink">Real {fc.count(real.people)}</span>
      {d !== null && <span className={TONE[deltaTone(d)]}>{d >= 0 ? "+" : ""}{Math.round(d * 100)} %</span>}
    </div>
  );
}

export const StepNode = memo(function StepNode({ id, data, selected }: NodeProps<StepNodeT>) {
  const item = getCatalogItem(data.catalogKey);
  const { bg: color, fg: ink } = stepColors(item);
  const Icon = item.icon;
  const isProcess = data.category === "process";
  const done = data.checklist?.filter((c) => c.done).length ?? 0;
  const total = data.checklist?.length ?? 0;
  const meta = [data.process?.owner, data.process?.slaHours ? `SLA ${data.process.slaHours} h` : null].filter(Boolean);
  const size = ICON_SIZES[data.iconSize ?? "md"];

  return (
    <div className="group flex w-[150px] flex-col items-center text-center">
      <Handles />
      {data.thumbnailUrl ? (
        <div
          className={`relative w-[140px] overflow-hidden rounded-md border-2 bg-surface shadow-sm ${selected ? "ring-4 ring-accent/40" : ""}`}
          style={{ borderColor: color }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.thumbnailUrl} alt="" className="h-[90px] w-full object-cover object-top" draggable={false} />
          <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: color, color: ink }}>
            <Icon size={13} aria-hidden />
          </span>
        </div>
      ) : (
        <div
          className={`flex items-center justify-center overflow-hidden shadow-sm transition ${isProcess ? "rounded-xl" : "rounded-full"} ${selected ? "ring-4 ring-accent/40" : ""}`}
          style={{ width: size.box, height: size.box, color: ink, backgroundColor: data.iconUrl ? "var(--surface)" : color, border: data.iconUrl ? `2px solid ${color}` : undefined }}
        >
          {data.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.iconUrl} alt="" className="h-full w-full object-contain p-1.5" draggable={false} />
          ) : (
            <Icon size={size.icon} strokeWidth={2} aria-hidden />
          )}
        </div>
      )}
      <p className="mt-2 line-clamp-2 text-[13px] font-medium leading-tight text-ink">{data.label || item.label}</p>
      {data.url && <p className="mt-0.5 max-w-full truncate text-[10px] text-muted">{data.url}</p>}
      {meta.length > 0 && <p className="mt-0.5 text-[10px] text-muted">{meta.join(" · ")}</p>}
      {(data.notes || total > 0) && (
        <div className="mt-1 flex items-center gap-2 text-[10px] text-muted">
          {data.notes && <StickyNote size={11} aria-label="Tiene notas" />}
          {total > 0 && (
            <span className="flex items-center gap-0.5">
              <ListChecks size={11} aria-hidden /> {done}/{total}
            </span>
          )}
        </div>
      )}
      <StepForecastBadge id={id} mapped={!!data.crm} />
    </div>
  );
});

const TEXT_SIZES = { sm: "text-sm", md: "text-base", lg: "text-xl font-semibold", xl: "text-3xl font-semibold" } as const;

export const TextNode = memo(function TextNode({ data, selected }: NodeProps<TextNodeT>) {
  return (
    <div
      className={`max-w-[640px] whitespace-pre-wrap rounded px-1 ${TEXT_SIZES[data.size]} ${data.bold ? "font-bold" : ""} ${data.align === "center" ? "text-center" : data.align === "right" ? "text-right" : ""} ${selected ? "outline outline-2 outline-accent/50" : ""}`}
      style={{ color: data.color ?? "var(--ink)" }}
    >
      {data.text || "Texto"}
    </div>
  );
});

export const ShapeNode = memo(function ShapeNode({ data, selected }: NodeProps<ShapeNodeT>) {
  return (
    <>
      <NodeResizer isVisible={selected} minWidth={80} minHeight={60} color="var(--accent)" />
      <div
        className={`h-full w-full ${data.shape === "triangle" ? "" : "border-2"} ${data.shape === "ellipse" ? "rounded-[50%]" : data.shape === "triangle" ? "" : "rounded-xl"}`}
        style={
          data.shape === "triangle"
            ? { backgroundColor: `${data.color}33`, clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }
            : { borderColor: data.color, backgroundColor: `${data.color}14` }
        }
      >
        {data.label && (
          <p className="px-3 pt-2 text-xs font-semibold uppercase tracking-wide" style={{ color: data.color }}>
            {data.label}
          </p>
        )}
      </div>
    </>
  );
});

export const ImageNode = memo(function ImageNode({ data, selected }: NodeProps<ImageNodeT>) {
  return (
    <>
      <NodeResizer isVisible={selected} minWidth={60} minHeight={40} keepAspectRatio color="var(--accent)" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={data.url}
        alt={data.alt ?? ""}
        draggable={false}
        className={`h-full w-full rounded-md object-contain ${selected ? "outline outline-2 outline-accent/50" : ""}`}
      />
    </>
  );
});

export const nodeTypes = { step: StepNode, text: TextNode, shape: ShapeNode, image: ImageNode, widget: ForecastWidgetNode };
