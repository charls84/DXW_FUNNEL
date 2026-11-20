import { describe, expect, it } from "vitest";
import { docToFlow, flowToDoc } from "./flow-types";
import { buildTemplate } from "@/lib/canvas/templates";
import type { CanvasDoc } from "@/lib/canvas/types";

describe("docToFlow / flowToDoc", () => {
  it("ida y vuelta sin perder datos (plantilla + forma + imagen)", () => {
    const doc: CanvasDoc = buildTemplate("booked-call");
    doc.nodes.push(
      { id: "shape1", type: "shape", position: { x: 1, y: 2 }, width: 300, height: 200, data: { shape: "rect", color: "#1d5bd6", label: "Etapa" } },
      { id: "img1", type: "image", position: { x: 5, y: 6 }, width: 120, height: 80, data: { url: "https://cdn.test/a.png", alt: "x" } },
    );
    doc.notes = "Notas";
    const flow = docToFlow(doc);
    expect(flow.nodes.find((n) => n.id === "shape1")?.zIndex).toBe(-1);
    const back = flowToDoc(flow.nodes, flow.edges, { notes: doc.notes, checklist: doc.checklist });
    expect(back).toEqual(doc);
  });
});
