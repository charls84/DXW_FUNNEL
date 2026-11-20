import { describe, expect, it } from "vitest";
import { alignNodes } from "./align";
import type { AppNode } from "./flow-types";

const step = (id: string, x: number, y: number, selected = true): AppNode =>
  ({ id, type: "step", position: { x, y }, selected, measured: { width: 100, height: 50 }, data: { catalogKey: "page-generic", category: "page", label: id } }) as AppNode;

describe("alignNodes", () => {
  const nodes = [step("a", 0, 0), step("b", 300, 80), step("c", 120, 200), step("z", 999, 999, false)];

  it("alinea a la izquierda, al centro y abajo", () => {
    expect([...alignNodes(nodes, "left").values()].map((p) => p.x)).toEqual([0, 0, 0]);
    expect([...alignNodes(nodes, "centerX").values()].map((p) => p.x)).toEqual([150, 150, 150]); // (0..400)/2 - 50
    expect([...alignNodes(nodes, "bottom").values()].map((p) => p.y)).toEqual([200, 200, 200]);
    expect(alignNodes(nodes, "left").has("z")).toBe(false);
  });

  it("distribuye en horizontal con espacios iguales", () => {
    const r = alignNodes(nodes, "distributeX");
    expect(r.get("a")?.x).toBe(0);
    expect(r.get("c")?.x).toBe(150);
    expect(r.get("b")?.x).toBe(300);
  });

  it("no hace nada con menos de dos (o tres para distribuir) seleccionados", () => {
    expect(alignNodes([step("a", 0, 0)], "left").size).toBe(0);
    expect(alignNodes([step("a", 0, 0), step("b", 10, 10)], "distributeX").size).toBe(0);
  });
});
