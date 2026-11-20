import { describe, expect, it } from "vitest";
import { sanitizeDoc } from "./doc";
import { TEMPLATES, buildTemplate } from "./templates";
import { CATALOG } from "./catalog";

describe("sanitizeDoc", () => {
  it("devuelve un documento vacío ante entradas inválidas", () => {
    for (const bad of [null, undefined, 42, "x", [], { nodes: "no" }]) {
      expect(sanitizeDoc(bad)).toMatchObject({ schema: 1, nodes: [], edges: [] });
    }
  });

  it("descarta nodos desconocidos y líneas que apuntan a nodos inexistentes", () => {
    const doc = sanitizeDoc({
      nodes: [
        { id: "a", type: "step", position: { x: 1, y: 2 }, data: { catalogKey: "page-landing", category: "page", label: "Landing" } },
        { id: "b", type: "hack", position: { x: 0, y: 0 }, data: {} },
      ],
      edges: [
        { id: "e1", source: "a", target: "a", data: { lineType: "indirect" } },
        { id: "e2", source: "a", target: "zzz", data: {} },
      ],
    });
    expect(doc.nodes.map((n) => n.id)).toEqual(["a"]);
    expect(doc.edges.map((e) => e.id)).toEqual(["e1"]);
    expect(doc.edges[0].data.lineType).toBe("indirect");
  });

  it("corrige valores fuera de rango", () => {
    const doc = sanitizeDoc({
      nodes: [
        { id: "s", type: "step", position: { x: "1", y: Infinity }, data: { category: "inventada", label: "x".repeat(500), process: { slaHours: -5 } } },
        { id: "sh", type: "shape", position: { x: 0, y: 0 }, data: { shape: "star", color: "red" } },
      ],
      edges: [{ id: "e", source: "s", target: "sh", data: { lineType: "zigzag" } }],
    });
    const step = doc.nodes[0];
    expect(step.position).toEqual({ x: 0, y: 0 });
    if (step.type !== "step") throw new Error("tipo inesperado");
    expect(step.data.category).toBe("page");
    expect(step.data.label).toHaveLength(120);
    expect(step.data.process?.slaHours).toBeNull();
    const shape = doc.nodes[1];
    if (shape.type !== "shape") throw new Error("tipo inesperado");
    expect(shape.data).toMatchObject({ shape: "rect", color: "#1d5bd6" });
    expect(doc.edges[0].data.lineType).toBe("direct");
  });
});

describe("plantillas", () => {
  it("cada plantilla produce un documento válido que sobrevive a la limpieza sin perder nada", () => {
    for (const t of TEMPLATES) {
      const doc = buildTemplate(t.key);
      const clean = sanitizeDoc(JSON.parse(JSON.stringify(doc)));
      expect(clean.nodes).toHaveLength(doc.nodes.length);
      expect(clean.edges).toHaveLength(doc.edges.length);
    }
  });

  it("solo usa elementos que existen en el catálogo", () => {
    const keys = new Set(CATALOG.map((c) => c.key));
    for (const t of TEMPLATES) {
      for (const n of buildTemplate(t.key).nodes) {
        if (n.type === "step") expect(keys.has(n.data.catalogKey)).toBe(true);
      }
    }
  });

  it("el proceso comercial DXW trae responsable y SLA en sus etapas", () => {
    const doc = buildTemplate("dxw-sales-process");
    const withSla = doc.nodes.filter((n) => n.type === "step" && n.data.process?.slaHours);
    expect(withSla.length).toBeGreaterThanOrEqual(5);
  });

  it("las claves del catálogo son únicas", () => {
    expect(new Set(CATALOG.map((c) => c.key)).size).toBe(CATALOG.length);
  });
});

describe("imágenes", () => {
  it("acepta solo URLs https (y data URLs pequeñas fuera de producción)", async () => {
    const { safeImageUrl } = await import("./doc");
    expect(safeImageUrl("https://x.supabase.co/storage/v1/object/public/canvas-assets/a.png")).toBeTruthy();
    expect(safeImageUrl("http://inseguro.com/a.png")).toBeUndefined();
    expect(safeImageUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeImageUrl('https://x.com/a.png" onerror="x')).toBeUndefined();
    expect(safeImageUrl("data:image/png;base64,AAAA")).toBeTruthy(); // los tests no corren en producción
    expect(safeImageUrl("data:text/html;base64,AAAA")).toBeUndefined();
  });

  it("conserva nodos de imagen válidos y descarta los que no tienen URL segura", () => {
    const doc = sanitizeDoc({
      nodes: [
        { id: "ok", type: "image", position: { x: 0, y: 0 }, width: 300, height: 200, data: { url: "https://cdn.test/a.png", alt: "Correo" } },
        { id: "bad", type: "image", position: { x: 0, y: 0 }, data: { url: "javascript:alert(1)" } },
        { id: "s", type: "step", position: { x: 0, y: 0 }, data: { catalogKey: "page-landing", category: "page", label: "L", iconUrl: "ftp://x", thumbnailUrl: "https://cdn.test/t.png" } },
      ],
      edges: [],
    });
    expect(doc.nodes.map((n) => n.id)).toEqual(["ok", "s"]);
    const step = doc.nodes[1];
    if (step.type !== "step") throw new Error("tipo inesperado");
    expect(step.data.iconUrl).toBeUndefined();
    expect(step.data.thumbnailUrl).toBe("https://cdn.test/t.png");
  });
});

describe("modo del mapa y tamaño de ícono", () => {
  it("conserva el modo prototipo y el tamaño del ícono, y descarta valores inválidos", () => {
    const doc = sanitizeDoc({
      schema: 1,
      mode: "prototype",
      nodes: [
        { id: "a", type: "step", position: { x: 0, y: 0 }, data: { catalogKey: "generic", category: "page", label: "A", iconSize: "xl" } },
        { id: "b", type: "step", position: { x: 0, y: 0 }, data: { catalogKey: "generic", category: "page", label: "B", iconSize: "huge" } },
        { id: "c", type: "step", position: { x: 0, y: 0 }, data: { catalogKey: "generic", category: "page", label: "C", iconSize: "md" } },
      ],
      edges: [],
    });
    expect(doc.mode).toBe("prototype");
    const sizes = doc.nodes.map((n) => (n.type === "step" ? n.data.iconSize : null));
    expect(sizes).toEqual(["xl", undefined, undefined]);
    expect(sanitizeDoc({ schema: 1, mode: "complete", nodes: [], edges: [] }).mode).toBeUndefined();
    expect(sanitizeDoc({ schema: 1, mode: "otro", nodes: [], edges: [] }).mode).toBeUndefined();
  });
});
