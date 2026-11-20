"use client";

import { memo } from "react";
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
import { ListChecks, StickyNote } from "lucide-react";
import { CATEGORY_META, getCatalogItem } from "@/lib/canvas/catalog";
import type { ImageNodeT, ShapeNodeT, StepNodeT, TextNodeT } from "./flow-types";

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

export const StepNode = memo(function StepNode({ data, selected }: NodeProps<StepNodeT>) {
  const item = getCatalogItem(data.catalogKey);
  const color = CATEGORY_META[data.category]?.color ?? "#334155";
  const Icon = item.icon;
  const isProcess = data.category === "process";
  const done = data.checklist?.filter((c) => c.done).length ?? 0;
  const total = data.checklist?.length ?? 0;
  const meta = [data.process?.owner, data.process?.slaHours ? `SLA ${data.process.slaHours} h` : null].filter(Boolean);

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
          <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full text-white" style={{ backgroundColor: color }}>
            <Icon size={13} aria-hidden />
          </span>
        </div>
      ) : (
        <div
          className={`flex h-14 w-14 items-center justify-center overflow-hidden text-white shadow-sm transition ${isProcess ? "rounded-xl" : "rounded-full"} ${selected ? "ring-4 ring-accent/40" : ""}`}
          style={{ backgroundColor: data.iconUrl ? "var(--surface)" : color, border: data.iconUrl ? `2px solid ${color}` : undefined }}
        >
          {data.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.iconUrl} alt="" className="h-full w-full object-contain p-1.5" draggable={false} />
          ) : (
            <Icon size={26} strokeWidth={2} aria-hidden />
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
    </div>
  );
});

const TEXT_SIZES = { sm: "text-sm", md: "text-base", lg: "text-xl font-semibold", xl: "text-3xl font-semibold" } as const;

export const TextNode = memo(function TextNode({ data, selected }: NodeProps<TextNodeT>) {
  return (
    <div className={`max-w-[640px] whitespace-pre-wrap rounded px-1 text-ink ${TEXT_SIZES[data.size]} ${selected ? "outline outline-2 outline-accent/50" : ""}`}>
      {data.text || "Texto"}
    </div>
  );
});

export const ShapeNode = memo(function ShapeNode({ data, selected }: NodeProps<ShapeNodeT>) {
  return (
    <>
      <NodeResizer isVisible={selected} minWidth={80} minHeight={60} color="var(--accent)" />
      <div
        className={`h-full w-full border-2 ${data.shape === "ellipse" ? "rounded-[50%]" : "rounded-xl"}`}
        style={{ borderColor: data.color, backgroundColor: `${data.color}14` }}
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

export const nodeTypes = { step: StepNode, text: TextNode, shape: ShapeNode, image: ImageNode };
