import { describe, expect, it } from "vitest";
import { isAllowedEmail } from "./domain";

describe("isAllowedEmail", () => {
  const domain = "doux.work";

  it("acepta correos del dominio, sin importar mayúsculas ni espacios", () => {
    expect(isAllowedEmail("ana@doux.work", domain)).toBe(true);
    expect(isAllowedEmail("  Ana@DOUX.Work ", domain)).toBe(true);
  });

  it("rechaza otros dominios, subdominios y dominios parecidos", () => {
    expect(isAllowedEmail("ana@gmail.com", domain)).toBe(false);
    expect(isAllowedEmail("ana@mail.doux.work", domain)).toBe(false);
    expect(isAllowedEmail("ana@doux.work.evil.com", domain)).toBe(false);
    expect(isAllowedEmail("ana@xdoux.work", domain)).toBe(false);
  });

  it("rechaza valores vacíos o mal formados", () => {
    expect(isAllowedEmail(null, domain)).toBe(false);
    expect(isAllowedEmail("", domain)).toBe(false);
    expect(isAllowedEmail("@doux.work", domain)).toBe(false);
    expect(isAllowedEmail("a@b@doux.work", domain)).toBe(false);
    expect(isAllowedEmail("ana@doux.work", "")).toBe(false);
  });
});
