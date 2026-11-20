"use client";

import "@xyflow/react/style.css";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
import { ArrowLeft, Calculator, History, ImageDown, ImagePlus, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Redo2, Share2, Square, Type, Undo2 } from "lucide-react";
import { computeForecast, type EngineEdge, type EngineStep } from "@/lib/forecast/engine";
import { DEFAULT_FORECAST, SCENARIO_LABELS, type ForecastSettings, type Scenario } from "@/lib/forecast/types";
import { ForecastContext, makeFormatters, type ForecastView } from "./forecast-context";
import { CATEGORY_META, getCatalogItem } from "@/lib/canvas/catalog";
import type { CanvasDoc, ChecklistItem, EdgeData, ImageData, ShapeData, StepData, TextData } from "@/lib/canvas/types";
import { EDGE_MARKER, docToFlow, flowToDoc, type AppNode, type FlowEdgeT } from "./flow-types";
import { nodeTypes } from "./nodes";
import { edgeTypes } from "./edge";
import { DRAG_MIME, LibraryPanel } from "./library-panel";
import { Inspector } from "./inspector";
import { useHistory } from "./use-history";
import { exportFlowPng } from "./export-png";
import { VersionsDrawer, type RevisionSummary } from "./versions-drawer";
import { ShareDialog, type ShareActions } from "./share-dialog";
import { IMAGE_TYPES, validateImage, type UploadImage } from "./upload-button";

export type SaveResult = { ok: true; version: number } | { ok: false; reason: "conflict" | "forbidden" | "error" };

export type CustomIcon = { id: string; name: string; url: string };

export type IconActions = {
  list: () => Promise<CustomIcon[]>;
  add: (name: string, url: string) => Promise<{ ok: true; icon: CustomIcon } | { ok: false }>;
  remove: (id: string) => Promise<{ ok: boolean }>;
};

export type DetailActions = {
  setTags: (tags: string[]) => Promise<{ ok: boolean }>;
  setTemplate: (isTemplate: boolean) => Promise<{ ok: boolean }>;
};

export type EditorActions = {
  save: (doc: CanvasDoc, expectedVersion: number) => Promise<SaveResult>;
  rename: (name: string) => Promise<{ ok: boolean }>;
  listRevisions: () => Promise<RevisionSummary[]>;
  createRevision: (note: string) => Promise<{ ok: boolean }>;
  restoreRevision: (revisionId: string) => Promise<{ ok: true; doc: CanvasDoc; version: number } | { ok: false }>;
  uploadImage?: UploadImage;
  icons?: IconActions;
  share?: ShareActions;
  details?: DetailActions;
};

type Props = {
  name: string;
  initialDoc: CanvasDoc;
  initialVersion: number;
  readOnly: boolean;
  backHref: string;
  actions: EditorActions;
  /** "shared": vista pública de solo lectura (sin navegación, versiones ni compartir). */
  mode?: "edit" | "shared";
  meta?: { tags: string[]; isTemplate: boolean };
  /** Moneda del workspace: se usa si el mapa todavía no tiene simulación configurada. */
  currency?: string;
};

const NOOP_ACTIONS: EditorActions = {
  save: async (_d, v) => ({ ok: true, version: v }),
  rename: async () => ({ ok: false }),
  listRevisions: async () => [],
  createRevision: async () => ({ ok: false }),
  restoreRevision: async () => ({ ok: false }),
};

/** Visor de solo lectura para links compartidos. */
export function SharedCanvasViewer({ name, doc }: { name: string; doc: CanvasDoc }) {
  return <CanvasEditor name={name} initialDoc={doc} initialVersion={1} readOnly backHref="/" actions={NOOP_ACTIONS} mode="shared" />;
}

function readImageSize(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 320, h: img.naturalHeight || 200 });
    img.onerror = () => resolve({ w: 320, h: 200 });
    img.src = url;
  });
}

type SaveStatus = "saved" | "dirty" | "saving" | "error" | "conflict" | "forbidden";

const STATUS_TEXT: Record<SaveStatus, string> = {
  saved: "Cambios guardados",
  dirty: "Cambios sin guardar",
  saving: "Guardando…",
  error: "No se pudo guardar. Reintentando…",
  conflict: "Otra persona cambió este mapa. Recarga la página para ver la última versión.",
  forbidden: "Tu rol no permite guardar cambios.",
};

export function CanvasEditor(props: Props) {
  return (
    <ReactFlowProvider>
      <Editor {...props} />
    </ReactFlowProvider>
  );
}

function Editor({ name: initialName, initialDoc, initialVersion, readOnly, backHref, actions, mode = "edit", meta, currency }: Props) {
  const shared = mode === "shared";
  const [initialForecast] = useState<ForecastSettings>(() => initialDoc.forecast ?? { ...DEFAULT_FORECAST, currency: currency ?? DEFAULT_FORECAST.currency });
  const [forecast, setForecast] = useState<ForecastSettings>(initialForecast);
  const patchForecast = useCallback((patch: Partial<ForecastSettings>) => setForecast((f) => ({ ...f, ...patch })), []);
  const [showShare, setShowShare] = useState(false);
  const [tags, setTags] = useState<string[]>(meta?.tags ?? []);
  const [isTemplate, setIsTemplate] = useState(meta?.isTemplate ?? false);
  const [customIcons, setCustomIcons] = useState<CustomIcon[]>([]);
  const imageInput = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (!actions.icons || readOnly) return;
    let alive = true;
    actions.icons
      .list()
      .then((list) => alive && setCustomIcons(list))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [actions.icons, readOnly]);
  const initial = useMemo(() => docToFlow(initialDoc), [initialDoc]);
  const [nodes, setNodes, baseOnNodesChange] = useNodesState<AppNode>(initial.nodes);
  const [edges, setEdges, baseOnEdgesChange] = useEdgesState<FlowEdgeT>(initial.edges);
  const [notes, setNotes] = useState(initialDoc.notes ?? "");
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialDoc.checklist ?? []);
  const [name, setName] = useState(initialName);
  const [showLibrary, setShowLibrary] = useState(!readOnly);
  const [showVersions, setShowVersions] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const rf = useReactFlow<AppNode, FlowEdgeT>();

  // ── Deshacer / rehacer ──
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useLayoutEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);
  const getCurrent = useCallback(() => ({ nodes: nodesRef.current, edges: edgesRef.current }), []);
  const applySnapshot = useCallback(
    (s: { nodes: AppNode[]; edges: FlowEdgeT[] }) => {
      setNodes(s.nodes);
      setEdges(s.edges);
    },
    [setNodes, setEdges],
  );
  const history = useHistory(getCurrent, applySnapshot);

  // ── Autoguardado ──
  const doc = useMemo(() => flowToDoc(nodes, edges, { notes, checklist, forecast }), [nodes, edges, notes, checklist, forecast]);
  const docString = useMemo(() => JSON.stringify(doc), [doc]);
  const lastSaved = useRef(JSON.stringify(flowToDoc(initial.nodes, initial.edges, { notes: initialDoc.notes ?? "", checklist: initialDoc.checklist ?? [], forecast: initialForecast })));
  const version = useRef(initialVersion);
  const saving = useRef(false);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const statusRef = useRef(status);
  const latestDoc = useRef({ doc, docString });
  useLayoutEffect(() => {
    statusRef.current = status;
    latestDoc.current = { doc, docString };
  }, [status, doc, docString]);

  const runSave = useCallback(async () => {
    if (readOnly || saving.current) return;
    if (statusRef.current === "conflict" || statusRef.current === "forbidden") return;
    const { doc: toSave, docString: str } = latestDoc.current;
    if (str === lastSaved.current) {
      setStatus("saved");
      return;
    }
    saving.current = true;
    setStatus("saving");
    let result: SaveResult;
    try {
      result = await actions.save(toSave, version.current);
    } catch {
      result = { ok: false, reason: "error" };
    }
    saving.current = false;
    if (result.ok) {
      version.current = result.version;
      lastSaved.current = str;
      setStatus(latestDoc.current.docString === str ? "saved" : "dirty");
    } else {
      setStatus(result.reason);
    }
  }, [actions, readOnly]);

  useEffect(() => {
    if (readOnly) return;
    if (docString === lastSaved.current) return;
    if (statusRef.current !== "conflict" && statusRef.current !== "forbidden" && statusRef.current !== "saving") setStatus("dirty");
    const t = setTimeout(runSave, 1200);
    return () => clearTimeout(t);
  }, [docString, readOnly, runSave]);

  useEffect(() => {
    if (status !== "error") return;
    const t = setTimeout(runSave, 5000);
    return () => clearTimeout(t);
  }, [status, runSave]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (latestDoc.current.docString !== lastSaved.current && !readOnly) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [readOnly]);

  // ── Cambios en el lienzo ──
  const onNodesChange: OnNodesChange<AppNode> = useCallback(
    (changes) => {
      if (changes.getByType("remove").length) history.record();
      baseOnNodesChange(changes);
    },
    [baseOnNodesChange, history],
  );
  const onEdgesChange: OnEdgesChange<FlowEdgeT> = useCallback(
    (changes) => {
      if (changes.getByType("remove").length) history.record();
      baseOnEdgesChange(changes);
    },
    [baseOnEdgesChange, history],
  );
  const onConnect = useCallback(
    (c: Connection) => {
      if (c.source === c.target) return;
      history.record();
      setEdges((eds) =>
        addEdge({ ...c, id: crypto.randomUUID(), type: "flow", data: { lineType: "direct" }, markerEnd: EDGE_MARKER }, eds),
      );
    },
    [history, setEdges],
  );

  const addStep = useCallback(
    (catalogKey: string, position?: { x: number; y: number }) => {
      const item = getCatalogItem(catalogKey);
      const pos =
        position ??
        rf.screenToFlowPosition({ x: window.innerWidth / 2 + (Math.random() * 60 - 30), y: window.innerHeight / 2 + (Math.random() * 60 - 30) });
      history.record();
      const id = crypto.randomUUID();
      setNodes((ns) => [
        ...ns.map((n) => ({ ...n, selected: false })),
        { id, type: "step", position: { x: pos.x - 75, y: pos.y - 28 }, selected: true, data: { catalogKey, category: item.category, label: item.label } },
      ]);
    },
    [history, rf, setNodes],
  );

  const addCustomIconStep = useCallback(
    (icon: CustomIcon) => {
      const pos = rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      history.record();
      setNodes((ns) => [
        ...ns.map((n) => ({ ...n, selected: false })),
        { id: crypto.randomUUID(), type: "step", position: { x: pos.x - 75, y: pos.y - 28 }, selected: true, data: { catalogKey: "act-custom", category: "action", label: icon.name, iconUrl: icon.url } },
      ]);
    },
    [history, rf, setNodes],
  );

  async function onImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !actions.uploadImage) return;
    const invalid = validateImage(file);
    if (invalid) return showToast(invalid);
    setUploadingImage(true);
    const r = await actions.uploadImage(file);
    setUploadingImage(false);
    if (!r.ok) return showToast(r.error);
    const { w, h } = await readImageSize(r.url);
    const scale = Math.min(1, 360 / w, 260 / h);
    const pos = rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const data: ImageData = { url: r.url, alt: file.name.replace(/\.[^.]+$/, "").slice(0, 200) };
    history.record();
    setNodes((ns) => [
      ...ns.map((n) => ({ ...n, selected: false })),
      { id: crypto.randomUUID(), type: "image", position: { x: pos.x - (w * scale) / 2, y: pos.y - (h * scale) / 2 }, width: Math.round(w * scale), height: Math.round(h * scale), selected: true, data },
    ]);
  }

  async function onTagsChange(next: string[]) {
    const prev = tags;
    setTags(next);
    const r = await actions.details?.setTags(next);
    if (r && !r.ok) {
      setTags(prev);
      showToast("No pudimos guardar los tags. Intenta de nuevo.");
    }
  }

  async function onTemplateChange(next: boolean) {
    setIsTemplate(next);
    const r = await actions.details?.setTemplate(next);
    if (r && !r.ok) {
      setIsTemplate(!next);
      showToast("No pudimos cambiar la opción de plantilla. Intenta de nuevo.");
    } else {
      showToast(next ? "El mapa ya aparece como plantilla de DXW." : "El mapa ya no es plantilla de DXW.");
    }
  }

  // ── Simulación ──
  const engineInput = useMemo(() => {
    const steps: EngineStep[] = [];
    for (const n of nodes) if (n.type === "step") steps.push({ id: n.id, forecast: n.data.forecast });
    const engineEdges: EngineEdge[] = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      visual: e.data?.lineType === "visual",
      forecast: e.data?.forecast,
    }));
    return { steps, engineEdges };
  }, [nodes, edges]);

  const forecastView = useMemo<ForecastView>(() => {
    const run = (s: Scenario) => computeForecast(engineInput.steps, engineInput.engineEdges, forecast, s);
    const byScenario = { conservative: run("conservative"), expected: run("expected"), optimistic: run("optimistic") };
    return { settings: forecast, result: byScenario[forecast.scenario], byScenario, ...makeFormatters(forecast.currency) };
  }, [engineInput, forecast]);

  const addForecastWidget = () => {
    const existing = nodesRef.current.find((n) => n.type === "widget");
    if (existing) {
      setNodes((ns) => ns.map((n) => ({ ...n, selected: n.id === existing.id })));
      rf.fitView({ nodes: [{ id: existing.id }], duration: 300, maxZoom: 1 });
      return;
    }
    const pos = rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    history.record();
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), { id: crypto.randomUUID(), type: "widget", position: { x: pos.x - 230, y: pos.y - 150 }, selected: true, data: { kind: "forecast" } }]);
    if (!forecast.showLayer) patchForecast({ showLayer: true });
  };

  const addText = () => {
    const pos = rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    history.record();
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), { id: crypto.randomUUID(), type: "text", position: pos, selected: true, data: { text: "Nuevo texto", size: "lg" } }]);
  };

  const addShape = () => {
    const pos = rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    history.record();
    setNodes((ns) => [
      ...ns.map((n) => ({ ...n, selected: false })),
      { id: crypto.randomUUID(), type: "shape", position: { x: pos.x - 150, y: pos.y - 100 }, width: 300, height: 200, zIndex: -1, selected: true, data: { shape: "rect", color: "#1d5bd6", label: "" } },
    ]);
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      const key = e.dataTransfer.getData(DRAG_MIME);
      if (!key) return;
      e.preventDefault();
      addStep(key, rf.screenToFlowPosition({ x: e.clientX, y: e.clientY }));
    },
    [addStep, rf],
  );

  // ── Selección e inspector ──
  const selectedNodes = nodes.filter((n) => n.selected);
  const selectedEdges = edges.filter((e) => e.selected);
  const selectedNode = selectedNodes.length === 1 && selectedEdges.length === 0 ? selectedNodes[0] : null;
  const selectedEdge = selectedEdges.length === 1 && selectedNodes.length === 0 ? selectedEdges[0] : null;

  const onNodeData = useCallback(
    (id: string, patch: Partial<StepData> | Partial<TextData> | Partial<ShapeData> | Partial<ImageData>) => {
      history.record(`node:${id}`);
      setNodes((ns) => ns.map((n) => (n.id === id ? ({ ...n, data: { ...n.data, ...patch } } as AppNode) : n)));
    },
    [history, setNodes],
  );
  const onEdgeData = useCallback(
    (id: string, patch: Partial<EdgeData>) => {
      history.record(`edge:${id}`);
      setEdges((es) => es.map((e) => (e.id === id ? { ...e, data: { lineType: "direct", ...e.data, ...patch } } : e)));
    },
    [history, setEdges],
  );
  const deleteSelection = useCallback(() => {
    const nodeIds = new Set(nodesRef.current.filter((n) => n.selected).map((n) => n.id));
    history.record();
    setNodes((ns) => ns.filter((n) => !nodeIds.has(n.id)));
    setEdges((es) => es.filter((e) => !e.selected && !nodeIds.has(e.source) && !nodeIds.has(e.target)));
  }, [history, setEdges, setNodes]);

  const duplicateSelection = useCallback(() => {
    const sel = nodesRef.current.filter((n) => n.selected);
    if (!sel.length) return;
    history.record();
    const idMap = new Map(sel.map((n) => [n.id, crypto.randomUUID()]));
    const copies = sel.map((n) => ({ ...structuredClone(n), id: idMap.get(n.id)!, position: { x: n.position.x + 40, y: n.position.y + 40 }, selected: true })) as AppNode[];
    const edgeCopies = edgesRef.current
      .filter((e) => idMap.has(e.source) && idMap.has(e.target))
      .map((e) => ({ ...structuredClone(e), id: crypto.randomUUID(), source: idMap.get(e.source)!, target: idMap.get(e.target)!, selected: false }));
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), ...copies]);
    setEdges((es) => [...es, ...edgeCopies]);
  }, [history, setEdges, setNodes]);

  // ── Atajos de teclado ──
  useEffect(() => {
    if (readOnly) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable=true]")) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        history.undo();
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        history.redo();
      } else if (k === "d") {
        e.preventDefault();
        duplicateSelection();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [duplicateSelection, history, readOnly]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  async function onExport() {
    try {
      await exportFlowPng(nodesRef.current, name);
      showToast("PNG descargado.");
    } catch {
      showToast("No pudimos exportar el mapa. Revisa que tenga al menos un elemento.");
    }
  }

  async function commitName() {
    const clean = name.trim();
    if (!clean || clean === initialName || readOnly) {
      if (!clean) setName(initialName);
      return;
    }
    const r = await actions.rename(clean);
    if (!r.ok) {
      setName(initialName);
      showToast("No pudimos cambiar el nombre. Intenta de nuevo.");
    }
  }

  async function onRestored(newDoc: CanvasDoc, newVersion: number) {
    const f = docToFlow(newDoc);
    history.record();
    version.current = newVersion;
    const restoredForecast = newDoc.forecast ?? forecast;
    const restoredStr = JSON.stringify(flowToDoc(f.nodes, f.edges, { notes: newDoc.notes ?? "", checklist: newDoc.checklist ?? [], forecast: restoredForecast }));
    lastSaved.current = restoredStr;
    setNodes(f.nodes);
    setEdges(f.edges);
    setNotes(newDoc.notes ?? "");
    setChecklist(newDoc.checklist ?? []);
    setForecast(restoredForecast);
    setStatus("saved");
    setShowVersions(false);
    showToast("Versión restaurada.");
  }

  return (
    <div className="flex h-screen flex-col bg-canvas">
      {/* Barra superior */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-3">
        {shared ? (
          <span className="px-1.5 text-[11px] font-semibold tracking-widest text-muted">DOUX.WORK</span>
        ) : (
          <Link href={backHref} className="rounded p-1.5 text-muted hover:bg-canvas hover:text-ink" aria-label="Volver al workspace">
            <ArrowLeft size={18} />
          </Link>
        )}
        {!readOnly && (
          <button type="button" onClick={() => setShowLibrary((v) => !v)} className="rounded p-1.5 text-muted hover:bg-canvas hover:text-ink" aria-label={showLibrary ? "Ocultar elementos" : "Mostrar elementos"} title={showLibrary ? "Ocultar elementos" : "Mostrar elementos"}>
            {showLibrary ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
        )}
        <label htmlFor="canvas-name" className="sr-only">Nombre del mapa</label>
        <input
          id="canvas-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          readOnly={readOnly}
          maxLength={120}
          className="min-w-0 max-w-xs rounded bg-transparent px-2 py-1 text-sm font-semibold outline-none hover:bg-canvas focus:bg-canvas"
        />
        <span role="status" className={`truncate text-xs ${status === "error" || status === "conflict" || status === "forbidden" ? "text-danger" : "text-muted"}`}>
          {shared ? "Vista de solo lectura" : readOnly ? "Solo lectura" : STATUS_TEXT[status]}
        </span>

        <div className="ml-auto flex items-center gap-1">
          {!readOnly && (
            <>
              <ToolButton label="Deshacer (Ctrl+Z)" onClick={history.undo} disabled={!history.canUndo}><Undo2 size={17} /></ToolButton>
              <ToolButton label="Rehacer (Ctrl+Shift+Z)" onClick={history.redo} disabled={!history.canRedo}><Redo2 size={17} /></ToolButton>
              <span className="mx-1 h-5 w-px bg-line" />
              <ToolButton label="Agregar texto" onClick={addText}><Type size={17} /></ToolButton>
              <ToolButton label="Agregar forma para agrupar" onClick={addShape}><Square size={17} /></ToolButton>
              {actions.uploadImage && (
                <>
                  <input ref={imageInput} type="file" accept={IMAGE_TYPES.join(",")} className="hidden" onChange={onImageFile} />
                  <ToolButton label={uploadingImage ? "Subiendo imagen…" : "Agregar imagen"} onClick={() => imageInput.current?.click()} disabled={uploadingImage}>
                    <ImagePlus size={17} />
                  </ToolButton>
                </>
              )}
            </>
          )}
          <span className="mx-1 h-5 w-px bg-line" />
          <button
            type="button"
            onClick={() => patchForecast({ showLayer: !forecast.showLayer })}
            aria-pressed={forecast.showLayer}
            title={forecast.showLayer ? "Ocultar números de la simulación" : "Mostrar números de la simulación"}
            className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium ${forecast.showLayer ? "bg-accent/10 text-accent" : "text-muted hover:bg-canvas hover:text-ink"}`}
          >
            <Calculator size={15} aria-hidden /> Simulación
          </button>
          {forecast.showLayer && (
            <>
              <label htmlFor="scenario-select" className="sr-only">Escenario</label>
              <select
                id="scenario-select"
                value={forecast.scenario}
                onChange={(e) => patchForecast({ scenario: e.target.value as Scenario })}
                className="rounded border border-line bg-surface px-1.5 py-1 text-xs text-ink"
                title="Escenario que se muestra en el mapa"
              >
                {(Object.keys(SCENARIO_LABELS) as Scenario[]).map((s) => (
                  <option key={s} value={s}>{SCENARIO_LABELS[s]}</option>
                ))}
              </select>
              {!readOnly && <ToolButton label="Agregar resumen de la simulación" onClick={addForecastWidget}><LayoutDashboard size={17} /></ToolButton>}
            </>
          )}
          <span className="mx-1 h-5 w-px bg-line" />
          <ToolButton label="Descargar PNG" onClick={onExport}><ImageDown size={17} /></ToolButton>
          {!shared && <ToolButton label="Versiones" onClick={() => setShowVersions(true)}><History size={17} /></ToolButton>}
          {!shared && !readOnly && actions.share && (
            <button type="button" onClick={() => setShowShare(true)} className="btn-primary ml-1 py-1.5 text-xs">
              <Share2 size={14} aria-hidden /> Compartir
            </button>
          )}
        </div>
      </header>

      <ForecastContext value={forecastView}>
      <div className="flex min-h-0 flex-1">
        {showLibrary && !readOnly && (
          <aside className="w-64 shrink-0 border-r border-line bg-surface">
            <LibraryPanel
              onAdd={(key) => addStep(key)}
              customIcons={actions.icons ? customIcons : null}
              onAddCustomIcon={addCustomIconStep}
              upload={actions.uploadImage}
              onIconUploaded={async (url, file) => {
                const r = await actions.icons?.add(file.name.replace(/\.[^.]+$/, "").slice(0, 80) || "Ícono", url);
                if (r?.ok) {
                  setCustomIcons((list) => [r.icon, ...list]);
                  showToast("Ícono guardado en el workspace.");
                } else showToast("No pudimos guardar el ícono. Intenta de nuevo.");
              }}
              onRemoveIcon={async (id) => {
                const r = await actions.icons?.remove(id);
                if (r?.ok) setCustomIcons((list) => list.filter((i) => i.id !== id));
                else showToast("No pudimos quitar el ícono. Intenta de nuevo.");
              }}
            />
          </aside>
        )}

        <div className="relative min-w-0 flex-1" onDragOver={(e) => { if (e.dataTransfer.types.includes(DRAG_MIME)) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } }} onDrop={onDrop}>
          <ReactFlow<AppNode, FlowEdgeT>
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStart={() => history.record()}
            connectionMode={ConnectionMode.Loose}
            defaultEdgeOptions={{ type: "flow", markerEnd: EDGE_MARKER }}
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable
            deleteKeyCode={readOnly ? null : ["Backspace", "Delete"]}
            multiSelectionKeyCode={["Shift", "Meta", "Control"]}
            selectionKeyCode="Shift"
            snapToGrid
            snapGrid={[10, 10]}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1.1 }}
            minZoom={0.1}
            maxZoom={2.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="var(--line)" />
            <Controls showInteractive={false} position="bottom-left" />
            <MiniMap
              position="bottom-right"
              pannable
              zoomable
              nodeColor={(n) => (n.type === "step" ? CATEGORY_META[(n.data as StepData).category]?.color ?? "#94a3b8" : "#cbd5e1")}
              maskColor="rgba(100,116,139,0.12)"
            />
          </ReactFlow>
          {nodes.length === 0 && !readOnly && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-lg border border-dashed border-line bg-surface/80 px-6 py-5 text-center">
                <p className="font-medium">Este mapa está vacío.</p>
                <p className="mt-1 text-sm text-muted">Arrastra elementos desde el panel izquierdo para empezar.</p>
              </div>
            </div>
          )}
          {toast && (
            <div role="status" className="absolute left-1/2 top-4 -translate-x-1/2 rounded-md bg-ink px-3 py-2 text-sm text-canvas shadow-lg">
              {toast}
            </div>
          )}
        </div>

        <aside className="w-80 shrink-0 overflow-y-auto border-l border-line bg-surface">
          <Inspector
            node={selectedNode}
            edge={selectedEdge}
            readOnly={readOnly}
            canvasNotes={notes}
            canvasChecklist={checklist}
            onCanvasNotes={setNotes}
            onCanvasChecklist={setChecklist}
            onNodeData={onNodeData}
            onEdgeData={onEdgeData}
            onDelete={deleteSelection}
            upload={actions.uploadImage}
            customIcons={customIcons}
            onForecastSettings={patchForecast}
            details={
              actions.details && !shared
                ? { tags, isTemplate, onTags: onTagsChange, onTemplate: onTemplateChange }
                : null
            }
          />
          {selectedNodes.length + selectedEdges.length > 1 && (
            <p className="px-4 pb-4 text-xs text-muted">
              {selectedNodes.length + selectedEdges.length} elementos seleccionados. Ctrl + D duplica; Supr elimina.
            </p>
          )}
        </aside>
      </div>
      </ForecastContext>

      {showShare && actions.share && <ShareDialog actions={actions.share} onClose={() => setShowShare(false)} />}

      {showVersions && (
        <VersionsDrawer
          readOnly={readOnly}
          hasUnsavedChanges={!readOnly && status !== "saved"}
          onClose={() => setShowVersions(false)}
          listRevisions={actions.listRevisions}
          createRevision={actions.createRevision}
          restoreRevision={actions.restoreRevision}
          onRestored={onRestored}
        />
      )}
    </div>
  );
}

function ToolButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={label} aria-label={label} className="rounded p-1.5 text-muted hover:bg-canvas hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent">
      {children}
    </button>
  );
}
