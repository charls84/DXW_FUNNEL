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
import { AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignHorizontalSpaceAround, AlignStartHorizontal, AlignStartVertical, AlignVerticalSpaceAround, ArrowLeft, Calculator, Download, HelpCircle, History, ImagePlus, LayoutDashboard, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Redo2, Share2, Square, Type, Undo2, Waves } from "lucide-react";
import { useViewport } from "@xyflow/react";
import { edgesCsv, stepsCsv } from "./export-csv";
import { PeopleDrawer, type PeopleTarget } from "./people-drawer";
import { ContextMenu, type MenuItem } from "./context-menu";
import { ALIGN_LABELS, alignNodes, type AlignKind } from "./align";
import { getCatalogItem as catalogItem } from "@/lib/canvas/catalog";
import { computeForecast, type EngineEdge, type EngineStep } from "@/lib/forecast/engine";
import { DEFAULT_FORECAST, SCENARIO_LABELS, type ForecastSettings, type Scenario } from "@/lib/forecast/types";
import { ForecastContext, makeFormatters, type ForecastView } from "./forecast-context";
import { computeActuals, crmExplorer, type ActualEdge, type ActualStep, type ExplorerEntry } from "@/lib/crm/actuals";
import { VIEW_LABELS, type CrmEvent, type ViewMode } from "@/lib/crm/types";
import { CATEGORY_META, getCatalogItem } from "@/lib/canvas/catalog";
import { CANVAS_MODE_LABELS, type CanvasDoc, type CanvasMode, type ChecklistItem, type EdgeData, type ImageData, type ShapeData, type StepData, type TextData } from "@/lib/canvas/types";
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
  /** Eventos del CRM en un período (datos reales). Sin esta acción, el mapa solo simula. */
  loadCrmEvents?: (fromIso: string, toIso: string) => Promise<CrmEvent[]>;
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

const modeExtra = (m: CanvasMode) => (m === "prototype" ? ("prototype" as const) : undefined);

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
  const [docMode, setDocMode] = useState<CanvasMode>(initialDoc.mode ?? "complete");
  // Prototipo: solo el flujo. La simulación y el CRM se ocultan pero sus datos se conservan en el documento.
  const proto = docMode === "prototype";
  // En prototipo el selector de modo se esconde detrás de la etiqueta "Prototipo" hasta que se hace clic.
  const [showModePicker, setShowModePicker] = useState(false);
  const [name, setName] = useState(initialName);
  const [showLibrary, setShowLibrary] = useState(!readOnly);
  // Panel derecho (detalles del elemento y del mapa). Se puede ocultar para ver el mapa más amplio.
  const [showInspector, setShowInspector] = useState(true);
  const [showVersions, setShowVersions] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [people, setPeople] = useState<PeopleTarget | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const clipboard = useRef<{ nodes: AppNode[]; edges: FlowEdgeT[] } | null>(null);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const rf = useReactFlow<AppNode, FlowEdgeT>();
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

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
  const doc = useMemo(() => flowToDoc(nodes, edges, { notes, checklist, forecast, mode: modeExtra(docMode) }), [nodes, edges, notes, checklist, forecast, docMode]);
  const changeMode = useCallback(
    (m: CanvasMode) => {
      setDocMode(m);
      setShowModePicker(false);
      // El resumen de la simulación no se muestra en prototipo: se quita de la selección para no dejar el panel abierto.
      if (m === "prototype") setNodes((ns) => ns.map((n) => (n.type === "widget" && n.selected ? { ...n, selected: false } : n)));
    },
    [setNodes],
  );
  // Lo que ve React Flow: en prototipo, el resumen de la simulación queda oculto (sigue guardado en el documento).
  const visibleNodes = useMemo(() => (proto ? nodes.map((n) => (n.type === "widget" ? { ...n, hidden: true } : n)) : nodes), [nodes, proto]);
  const docString = useMemo(() => JSON.stringify(doc), [doc]);
  const lastSaved = useRef(JSON.stringify(flowToDoc(initial.nodes, initial.edges, { notes: initialDoc.notes ?? "", checklist: initialDoc.checklist ?? [], forecast: initialForecast, mode: modeExtra(initialDoc.mode ?? "complete") })));
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

  const saveIconToLibrary = useCallback(
    async (url: string, file: File) => {
      const r = await actions.icons?.add(file.name.replace(/\.[^.]+$/, "").slice(0, 80) || "Logo", url);
      if (r?.ok) {
        setCustomIcons((list) => [r.icon, ...list]);
        showToast("Logo guardado en la biblioteca del equipo.");
      } else showToast("No pudimos guardar el logo en la biblioteca. Intenta de nuevo.");
    },
    [actions.icons, showToast],
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

  // ── Datos reales del CRM (últimos N días, con N = horizonte de la simulación) ──
  const [crmData, setCrmData] = useState<{ days: number; events: CrmEvent[]; range: { from: Date; to: Date } } | null>(null);
  const [crmFailure, setCrmFailure] = useState<{ days: number; message: string } | null>(null);
  // En modo prototipo no se cargan ni se muestran datos del CRM.
  const loadCrm = proto ? undefined : actions.loadCrmEvents;
  useEffect(() => {
    if (!loadCrm) return;
    let alive = true;
    const days = forecast.days;
    const to = new Date();
    const from = new Date(to.getTime() - days * 86_400_000);
    // Se cargan 2N días: el período actual y el anterior, para mostrar tendencias.
    const fromPrev = new Date(to.getTime() - 2 * days * 86_400_000);
    loadCrm(fromPrev.toISOString(), to.toISOString())
      .then((events) => alive && setCrmData({ days, events, range: { from, to } }))
      .catch(() => alive && setCrmFailure({ days, message: "No pudimos cargar los datos del CRM. Recarga para intentar de nuevo." }));
    return () => {
      alive = false;
    };
  }, [loadCrm, forecast.days]);
  // "Cargando" mientras no haya datos ni error para el horizonte actual.
  const crmLoading = !!loadCrm && crmData?.days !== forecast.days && crmFailure?.days !== forecast.days;
  const crmError = crmFailure?.days === forecast.days ? crmFailure.message : null;
  const crmEvents = crmData?.events ?? null;
  const crmRange = crmData?.range ?? null;

  const actual = useMemo(() => {
    if (!crmEvents || !crmRange) return null;
    const steps: ActualStep[] = [];
    for (const n of nodes) if (n.type === "step") steps.push({ id: n.id, crm: n.data.crm, slaHours: n.data.process?.slaHours ?? null });
    const actualEdges: ActualEdge[] = edges.map((e) => ({ id: e.id, source: e.source, target: e.target, visual: e.data?.lineType === "visual" }));
    const days = crmRange.to.getTime() - crmRange.from.getTime();
    const previousRange = { from: new Date(crmRange.from.getTime() - days), to: new Date(crmRange.from.getTime() - 1) };
    return {
      current: computeActuals(steps, actualEdges, crmEvents, crmRange),
      previous: computeActuals(steps, actualEdges, crmEvents, previousRange),
    };
  }, [crmEvents, crmRange, nodes, edges]);
  const explorer = useMemo(() => {
    if (!crmEvents || !crmRange) return null;
    const fromMs = crmRange.from.getTime();
    return crmExplorer(crmEvents.filter((e) => Date.parse(e.occurredAt) >= fromMs));
  }, [crmEvents, crmRange]);

  const forecastView = useMemo<ForecastView>(() => {
    const run = (s: Scenario) => computeForecast(engineInput.steps, engineInput.engineEdges, forecast, s);
    const byScenario = { conservative: run("conservative"), expected: run("expected"), optimistic: run("optimistic") };
    // Sin CRM, la vista siempre es simulación (por ejemplo, en links compartidos). En prototipo, la capa de números va apagada.
    const settings = loadCrm ? forecast : { ...forecast, view: "forecast" as const, showLayer: proto ? false : forecast.showLayer };
    return {
      settings,
      result: byScenario[forecast.scenario],
      byScenario,
      actual: loadCrm ? actual?.current ?? null : null,
      previous: loadCrm ? actual?.previous ?? null : null,
      explorer: loadCrm ? explorer : null,
      crm: { available: !!loadCrm, loading: crmLoading, error: crmError },
      ...makeFormatters(forecast.currency),
    };
  }, [engineInput, forecast, actual, explorer, loadCrm, crmLoading, crmError, proto]);

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

  const addCrmStep = useCallback(
    (entry: ExplorerEntry) => {
      const m = entry.match;
      const key =
        m.type === "lead_created" ? "crm-lead" : m.type === "deal_won" ? "crm-won" : m.type === "deal_lost" ? "crm-lost" : m.type === "payment" ? "crm-paid" : m.type === "appointment" ? "act-booking" : "proc-stage";
      const item = catalogItem(key);
      const label = m.type === "lead_created" ? (m.source ? `Lead · ${m.source}` : "Lead nuevo") : m.type === "stage_changed" ? (m.stage ?? item.label) : item.label;
      const pos = rf.screenToFlowPosition({ x: window.innerWidth / 2 + (Math.random() * 60 - 30), y: window.innerHeight / 2 + (Math.random() * 60 - 30) });
      history.record();
      setNodes((ns) => [
        ...ns.map((n) => ({ ...n, selected: false })),
        { id: crypto.randomUUID(), type: "step", position: { x: pos.x - 75, y: pos.y - 28 }, selected: true, data: { catalogKey: key, category: item.category, label, crm: m } },
      ]);
      showToast(`"${label}" agregado y conectado al CRM.`);
    },
    [history, rf, setNodes, showToast],
  );

  const copySelection = useCallback(() => {
    const sel = nodesRef.current.filter((n) => n.selected);
    if (!sel.length) return false;
    const ids = new Set(sel.map((n) => n.id));
    clipboard.current = { nodes: structuredClone(sel), edges: structuredClone(edgesRef.current.filter((e) => ids.has(e.source) && ids.has(e.target))) };
    return true;
  }, []);

  const pasteClipboard = useCallback(
    (at?: { x: number; y: number }) => {
      const clip = clipboard.current;
      if (!clip?.nodes.length) return;
      const minX = Math.min(...clip.nodes.map((n) => n.position.x));
      const minY = Math.min(...clip.nodes.map((n) => n.position.y));
      const target = at ?? (lastPointer.current ? rf.screenToFlowPosition(lastPointer.current) : { x: minX + 40, y: minY + 40 });
      const idMap = new Map(clip.nodes.map((n) => [n.id, crypto.randomUUID()]));
      history.record();
      const copies = clip.nodes.map((n) => ({ ...structuredClone(n), id: idMap.get(n.id)!, position: { x: n.position.x - minX + target.x, y: n.position.y - minY + target.y }, selected: true })) as AppNode[];
      const edgeCopies = clip.edges.map((e) => ({ ...structuredClone(e), id: crypto.randomUUID(), source: idMap.get(e.source)!, target: idMap.get(e.target)!, selected: false }));
      setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), ...copies]);
      setEdges((es) => [...es, ...edgeCopies]);
    },
    [history, rf, setEdges, setNodes],
  );

  const align = useCallback(
    (kind: AlignKind) => {
      const moves = alignNodes(nodesRef.current, kind);
      if (!moves.size) return;
      history.record();
      setNodes((ns) => ns.map((n) => (moves.has(n.id) ? { ...n, position: moves.get(n.id)! } : n)));
    },
    [history, setNodes],
  );

  const reorder = useCallback(
    (id: string, dir: "front" | "back") => {
      history.record();
      setNodes((ns) => {
        const node = ns.find((n) => n.id === id);
        if (!node) return ns;
        const rest = ns.filter((n) => n.id !== id);
        const z = node.type === "shape" ? (dir === "front" ? 0 : -1) : dir === "front" ? 1 : 0;
        const moved = { ...node, zIndex: z } as AppNode;
        return dir === "front" ? [...rest, moved] : [moved, ...rest];
      });
    },
    [history, setNodes],
  );

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
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("input, textarea, select, [contenteditable=true]")) return;
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
      } else if (k === "c") {
        if (copySelection()) e.preventDefault();
      } else if (k === "v") {
        if (clipboard.current) {
          e.preventDefault();
          pasteClipboard();
        }
      } else if (k === "a") {
        e.preventDefault();
        setNodes((ns) => ns.map((n) => ({ ...n, selected: true })));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [copySelection, duplicateSelection, history, pasteClipboard, readOnly, setNodes]);

  async function onExport(scale: 1 | 2 | 3) {
    setShowExport(false);
    try {
      await exportFlowPng(nodesRef.current, name, scale);
      showToast("PNG descargado.");
    } catch {
      showToast("No pudimos exportar el mapa. Revisa que tenga al menos un elemento.");
    }
  }

  // ── Menú contextual ──
  type MenuSpec = { x: number; y: number; kind: "node" | "edge" | "pane"; id?: string };
  const openMenu = (menu: MenuSpec) => setMenu({ x: menu.x, y: menu.y, items: menuItems(menu) });
  const menuItems = (menu: MenuSpec): MenuItem[] => {
    const hasClip = !!clipboard.current;
    if (menu.kind === "pane") {
      return [
        { label: "Pegar", onSelect: () => pasteClipboard(rf.screenToFlowPosition({ x: menu.x, y: menu.y })), disabled: !hasClip || readOnly, shortcut: "Ctrl+V" },
        { label: "Seleccionar todo", onSelect: () => setNodes((ns) => ns.map((n) => ({ ...n, selected: true }))), shortcut: "Ctrl+A" },
        "separator",
        { label: "Agregar texto aquí", onSelect: () => { const p = rf.screenToFlowPosition({ x: menu.x, y: menu.y }); history.record(); setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), { id: crypto.randomUUID(), type: "text", position: p, selected: true, data: { text: "Nuevo texto", size: "lg" } }]); }, disabled: readOnly },
        { label: "Agregar forma aquí", onSelect: () => { const p = rf.screenToFlowPosition({ x: menu.x, y: menu.y }); history.record(); setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), { id: crypto.randomUUID(), type: "shape", position: { x: p.x - 150, y: p.y - 100 }, width: 300, height: 200, zIndex: -1, selected: true, data: { shape: "rect", color: "#1d5bd6", label: "" } }]); }, disabled: readOnly },
        "separator",
        { label: "Ajustar a la vista", onSelect: () => rf.fitView({ padding: 0.2, duration: 300 }) },
      ];
    }
    if (menu.kind === "edge") {
      const e = edgesRef.current.find((x) => x.id === menu.id);
      const setType = (lineType: "direct" | "indirect" | "visual") => onEdgeData(menu.id!, { lineType });
      return [
        { label: "Línea directa", onSelect: () => setType("direct"), disabled: readOnly || e?.data?.lineType === "direct" },
        { label: "Línea indirecta", onSelect: () => setType("indirect"), disabled: readOnly || e?.data?.lineType === "indirect" },
        { label: "Solo visual", onSelect: () => setType("visual"), disabled: readOnly || e?.data?.lineType === "visual" },
        "separator",
        ...(loadCrm && e && e.data?.lineType !== "visual" ? [{ label: "Ver personas", onSelect: () => setPeople({ kind: "edge", id: e.id, label: e.data?.label || "línea" }) } as MenuItem] : []),
        { label: "Eliminar línea", onSelect: () => { history.record(); setEdges((es) => es.filter((x) => x.id !== menu.id)); }, danger: true, disabled: readOnly, shortcut: "Supr" },
      ];
    }
    const node = nodesRef.current.find((x) => x.id === menu.id);
    const selectThis = () => setNodes((ns) => ns.map((n) => ({ ...n, selected: n.id === menu.id || (n.selected && ns.filter((x) => x.selected).length > 1) })));
    return [
      { label: "Duplicar", onSelect: () => { selectThis(); setTimeout(duplicateSelection, 0); }, disabled: readOnly, shortcut: "Ctrl+D" },
      { label: "Copiar", onSelect: () => { selectThis(); setTimeout(copySelection, 0); }, shortcut: "Ctrl+C" },
      "separator",
      ...(node?.type === "step" && loadCrm ? [{ label: "Ver personas", onSelect: () => setPeople({ kind: "step", id: node.id, label: node.data.label }) } as MenuItem] : []),
      { label: "Traer al frente", onSelect: () => reorder(menu.id!, "front"), disabled: readOnly },
      { label: "Enviar atrás", onSelect: () => reorder(menu.id!, "back"), disabled: readOnly },
      "separator",
      { label: "Eliminar", onSelect: () => { selectThis(); setTimeout(deleteSelection, 0); }, danger: true, disabled: readOnly, shortcut: "Supr" },
    ];
  };

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
    const restoredMode = newDoc.mode ?? "complete";
    const restoredStr = JSON.stringify(flowToDoc(f.nodes, f.edges, { notes: newDoc.notes ?? "", checklist: newDoc.checklist ?? [], forecast: restoredForecast, mode: modeExtra(restoredMode) }));
    lastSaved.current = restoredStr;
    setNodes(f.nodes);
    setEdges(f.edges);
    setNotes(newDoc.notes ?? "");
    setChecklist(newDoc.checklist ?? []);
    setForecast(restoredForecast);
    setDocMode(restoredMode);
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
          {readOnly ? (
            proto && <span className="rounded bg-canvas px-2 py-1 text-xs font-medium text-muted" title="Solo el flujo, sin simulación ni datos del CRM">Prototipo</span>
          ) : proto && !showModePicker ? (
            <button
              type="button"
              onClick={() => setShowModePicker(true)}
              className="rounded bg-canvas px-2 py-1 text-xs font-medium text-muted hover:text-ink"
              title="Solo el flujo, sin simulación ni datos del CRM. Clic para cambiar el modo."
              aria-label="Modo Prototipo. Cambiar modo del mapa"
            >
              Prototipo
            </button>
          ) : (
            <>
              <label htmlFor="mode-select" className="sr-only">Modo del mapa</label>
              <select
                id="mode-select"
                value={docMode}
                autoFocus={proto}
                onBlur={() => proto && setShowModePicker(false)}
                onChange={(e) => changeMode(e.target.value as CanvasMode)}
                className="rounded border border-line bg-surface px-1.5 py-1 text-xs text-ink"
                title="Prototipo: solo el flujo. Completo: con simulación y datos del CRM."
              >
                {(Object.keys(CANVAS_MODE_LABELS) as CanvasMode[]).map((m) => (
                  <option key={m} value={m}>{CANVAS_MODE_LABELS[m]}</option>
                ))}
              </select>
            </>
          )}
          {!proto && (
          <button
            type="button"
            onClick={() => patchForecast({ showLayer: !forecast.showLayer })}
            aria-pressed={forecast.showLayer}
            title={forecast.showLayer ? "Ocultar números de la simulación" : "Mostrar números de la simulación"}
            className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium ${forecast.showLayer ? "bg-accent/10 text-accent" : "text-muted hover:bg-canvas hover:text-ink"}`}
          >
            <Calculator size={15} aria-hidden /> Simulación
          </button>
          )}
          {!proto && forecast.showLayer && loadCrm && (
            <>
              <label htmlFor="view-select" className="sr-only">Qué números mostrar</label>
              <select
                id="view-select"
                value={forecast.view}
                onChange={(e) => patchForecast({ view: e.target.value as ViewMode })}
                className="rounded border border-line bg-surface px-1.5 py-1 text-xs text-ink"
                title="Simulación, datos reales del CRM o ambos"
              >
                {(Object.keys(VIEW_LABELS) as ViewMode[]).map((v) => (
                  <option key={v} value={v}>{VIEW_LABELS[v]}</option>
                ))}
              </select>
            </>
          )}
          {!proto && forecast.showLayer && (
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
          <ToolButton label={forecast.animateFlow ? "Detener la animación de flujo" : "Animar el flujo entre pasos"} onClick={() => patchForecast({ animateFlow: !forecast.animateFlow || undefined })}>
            <Waves size={17} className={forecast.animateFlow ? "text-accent" : undefined} />
          </ToolButton>
          <span className="mx-1 h-5 w-px bg-line" />
          <div className="relative">
            <ToolButton label="Descargar" onClick={() => setShowExport((v) => !v)}><Download size={17} /></ToolButton>
            {showExport && (
              <div role="menu" className="absolute right-0 top-full z-40 mt-1 w-52 rounded-md border border-line bg-surface py-1 text-sm shadow-lg" onMouseLeave={() => setShowExport(false)}>
                <p className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase text-muted">Imagen</p>
                {([1, 2, 3] as const).map((sc) => (
                  <button key={sc} type="button" role="menuitem" onClick={() => onExport(sc)} className="block w-full px-3 py-1.5 text-left hover:bg-canvas">PNG ×{sc}{sc === 2 ? " (recomendado)" : sc === 3 ? " (impresión)" : ""}</button>
                ))}
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase text-muted">Datos</p>
                <button type="button" role="menuitem" onClick={() => { setShowExport(false); stepsCsv(nodesRef.current, forecastView, name); }} className="block w-full px-3 py-1.5 text-left hover:bg-canvas">CSV de pasos</button>
                <button type="button" role="menuitem" onClick={() => { setShowExport(false); edgesCsv(nodesRef.current, edgesRef.current, forecastView, name); }} className="block w-full px-3 py-1.5 text-left hover:bg-canvas">CSV de líneas</button>
              </div>
            )}
          </div>
          {!shared && <ToolButton label="Versiones" onClick={() => setShowVersions(true)}><History size={17} /></ToolButton>}
          <ToolButton label="Ayuda y atajos" onClick={() => setShowHelp(true)}><HelpCircle size={17} /></ToolButton>
          <ToolButton label={showInspector ? "Ocultar panel de detalles" : "Mostrar panel de detalles"} onClick={() => setShowInspector((v) => !v)}>
            {showInspector ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
          </ToolButton>
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
              onAddCrmStep={addCrmStep}
              customIcons={actions.icons ? customIcons : null}
              onAddCustomIcon={addCustomIconStep}
              upload={actions.uploadImage}
              onIconUploaded={saveIconToLibrary}
              onRemoveIcon={async (id) => {
                const r = await actions.icons?.remove(id);
                if (r?.ok) setCustomIcons((list) => list.filter((i) => i.id !== id));
                else showToast("No pudimos quitar el ícono. Intenta de nuevo.");
              }}
            />
          </aside>
        )}

        <div className="relative min-w-0 flex-1" onMouseMove={(e) => { lastPointer.current = { x: e.clientX, y: e.clientY }; }} onDragOver={(e) => { if (e.dataTransfer.types.includes(DRAG_MIME)) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } }} onDrop={onDrop}>
          <ReactFlow<AppNode, FlowEdgeT>
            nodes={visibleNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStart={() => history.record()}
            onNodeContextMenu={(e, node) => { e.preventDefault(); openMenu({ x: e.clientX, y: e.clientY, kind: "node", id: node.id }); }}
            onEdgeContextMenu={(e, edge) => { e.preventDefault(); openMenu({ x: e.clientX, y: e.clientY, kind: "edge", id: edge.id }); }}
            onPaneContextMenu={(e) => { e.preventDefault(); openMenu({ x: e.clientX, y: e.clientY, kind: "pane" }); }}
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
          <ZoomBadge />
          {!readOnly && selectedNodes.length >= 2 && (
            <div className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-0.5 rounded-md border border-line bg-surface p-1 shadow-md" role="toolbar" aria-label="Alinear seleccionados">
              {(
                [
                  ["left", AlignStartVertical], ["centerX", AlignCenterVertical], ["right", AlignEndVertical],
                  ["top", AlignStartHorizontal], ["centerY", AlignCenterHorizontal], ["bottom", AlignEndHorizontal],
                  ["distributeX", AlignHorizontalSpaceAround], ["distributeY", AlignVerticalSpaceAround],
                ] as const
              ).map(([kind, Icon], i) => (
                <span key={kind} className="flex items-center">
                  {(i === 3 || i === 6) && <span className="mx-0.5 h-4 w-px bg-line" />}
                  <ToolButton label={ALIGN_LABELS[kind]} onClick={() => align(kind)} disabled={kind.startsWith("distribute") && selectedNodes.length < 3}>
                    <Icon size={16} />
                  </ToolButton>
                </span>
              ))}
              <span className="ml-1 pr-1 text-[11px] text-muted">{selectedNodes.length} seleccionados</span>
            </div>
          )}
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

        {showInspector && (
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
            onShowPeople={loadCrm ? setPeople : undefined}
            prototype={proto}
            mode={docMode}
            onMode={shared ? undefined : changeMode}
            onIconUploaded={actions.icons ? saveIconToLibrary : undefined}
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
        )}
      </div>
      </ForecastContext>

      {showShare && actions.share && <ShareDialog actions={actions.share} onClose={() => setShowShare(false)} />}
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}
      {people && (
        <ForecastContext value={forecastView}>
          <PeopleDrawer target={people} onClose={() => setPeople(null)} />
        </ForecastContext>
      )}
      {showHelp && <HelpDialog onClose={() => setShowHelp(false)} crm={!!loadCrm} prototype={proto} />}

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

function ZoomBadge() {
  const { zoom } = useViewport();
  return (
    <div className="pointer-events-none absolute bottom-3 left-14 rounded border border-line bg-surface px-1.5 py-0.5 text-[11px] text-muted" aria-live="off">
      {Math.round(zoom * 100)} %
    </div>
  );
}

function HelpDialog({ onClose, crm, prototype }: { onClose: () => void; crm: boolean; prototype: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const rows: [string, string][] = [
    ["Conectar pasos", "Arrastra desde los puntos del borde de un paso hasta otro."],
    ["Mover el lienzo", "Arrastra el fondo o usa la rueda del mouse para acercar y alejar."],
    ["Seleccionar varios", "Shift + arrastrar sobre el fondo, o Ctrl + clic en cada uno. Ctrl + A selecciona todo."],
    ["Alinear", "Con dos o más seleccionados aparece la barra para alinear y distribuir."],
    ["Copiar y pegar", "Ctrl + C y Ctrl + V. Se pega donde está el cursor."],
    ["Duplicar", "Ctrl + D."],
    ["Deshacer y rehacer", "Ctrl + Z y Ctrl + Shift + Z."],
    ["Eliminar", "Supr o Retroceso."],
    ["Menú contextual", "Clic derecho sobre un paso, una línea o el fondo."],
    ["Paneles", "Los botones de la barra superior ocultan o muestran la biblioteca de elementos (izquierda) y el panel de detalles (derecha)."],
    ["Modo del mapa", "Prototipo muestra solo el flujo; Completo agrega simulación y datos del CRM. Se cambia en la barra superior."],
    ...(prototype ? [] : [["Simulación", "Activa la capa en la barra superior. Los pasos de entrada llevan volumen; las líneas, tasa de conversión."] as [string, string]]),
    ...(crm ? [["Datos reales", "Conecta cada paso a un evento del CRM en el panel derecho y cambia la vista a Real o Comparar. Cada número abre la lista de personas."] as [string, string]] : []),
    ["Compartir", "Crea un link de solo lectura con contraseña y vencimiento para clientes."],
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="help-title" className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 id="help-title" className="font-semibold">Cómo usar el editor</h2>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-sm text-muted hover:bg-canvas">Cerrar</button>
        </div>
        <dl className="mt-3 space-y-2 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[140px_1fr] gap-2">
              <dt className="font-medium">{k}</dt>
              <dd className="text-muted">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
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
