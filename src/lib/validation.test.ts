import { describe, expect, it } from "vitest";
import { parseWorkspaceForm } from "./validation";
import { canDeleteWorkspaces, canEditWorkspaces, canManageMembers, isRole } from "./permissions";

const form = (values: Record<string, string>) => {
  const f = new FormData();
  Object.entries(values).forEach(([k, v]) => f.set(k, v));
  return f;
};

describe("parseWorkspaceForm", () => {
  it("normaliza un formulario válido", () => {
    const r = parseWorkspaceForm(
      form({ name: "  Proceso comercial DXW ", type: "internal", main_url: "https://Doux.work/", timezone: "America/Bogota", currency: "cop" }),
    );
    expect(r).toEqual({
      ok: true,
      value: { name: "Proceso comercial DXW", type: "internal", main_url: "doux.work", timezone: "America/Bogota", currency: "COP" },
    });
  });

  it("permite sitio vacío", () => {
    const r = parseWorkspaceForm(form({ name: "Cliente A", type: "client", main_url: "", timezone: "UTC", currency: "USD" }));
    expect(r.ok && r.value.main_url).toBe(null);
  });

  it("rechaza nombre vacío, tipo, moneda, zona horaria y sitio inválidos", () => {
    const base = { name: "X", type: "client", main_url: "", timezone: "UTC", currency: "USD" };
    expect(parseWorkspaceForm(form({ ...base, name: " " })).ok).toBe(false);
    expect(parseWorkspaceForm(form({ ...base, type: "otro" })).ok).toBe(false);
    expect(parseWorkspaceForm(form({ ...base, currency: "dolares" })).ok).toBe(false);
    expect(parseWorkspaceForm(form({ ...base, timezone: "Marte/Olympus" })).ok).toBe(false);
    expect(parseWorkspaceForm(form({ ...base, main_url: "no es un sitio" })).ok).toBe(false);
  });
});

describe("permisos por rol", () => {
  it("admin puede todo; editor edita; viewer solo lee", () => {
    expect([canEditWorkspaces("admin"), canDeleteWorkspaces("admin"), canManageMembers("admin")]).toEqual([true, true, true]);
    expect([canEditWorkspaces("editor"), canDeleteWorkspaces("editor"), canManageMembers("editor")]).toEqual([true, false, false]);
    expect([canEditWorkspaces("viewer"), canDeleteWorkspaces("viewer"), canManageMembers("viewer")]).toEqual([false, false, false]);
  });

  it("isRole solo acepta roles conocidos", () => {
    expect(isRole("editor")).toBe(true);
    expect(isRole("client")).toBe(false);
  });
});
