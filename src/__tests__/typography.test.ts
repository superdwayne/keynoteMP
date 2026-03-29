import { describe, it, expect } from "vitest";
import { createTypeScale, getTypeStyle } from "../design/typography.js";
import type { TypeRole } from "../design/typography.js";

describe("createTypeScale", () => {
  const scale = createTypeScale(18, 1.25);

  it("produces body size at base", () => {
    expect(scale.body.fontSize).toBe(18);
  });

  it("produces heading larger than body", () => {
    expect(scale.heading.fontSize).toBeGreaterThan(scale.body.fontSize);
  });

  it("produces display larger than heading", () => {
    expect(scale.display.fontSize).toBeGreaterThan(scale.heading.fontSize);
  });

  it("produces caption smaller than body", () => {
    expect(scale.caption.fontSize).toBeLessThan(scale.body.fontSize);
  });

  it("has correct modular scale math for heading (step 2)", () => {
    // heading = 18 * 1.25^2 = 28.125, rounded to 2 decimal places
    expect(scale.heading.fontSize).toBeCloseTo(28.13, 1);
  });

  it("produces all 8 roles", () => {
    const roles: TypeRole[] = [
      "display", "heading", "subheading", "body",
      "bodySmall", "caption", "overline", "quote",
    ];
    for (const role of roles) {
      expect(scale[role]).toBeDefined();
      expect(scale[role].fontName).toBeTruthy();
      expect(scale[role].fontSize).toBeGreaterThan(0);
    }
  });

  it("uses Georgia for quote role", () => {
    expect(scale.quote.fontName).toBe("Georgia");
  });

  it("sets bold weight for display", () => {
    expect(scale.display.fontWeight).toBe("bold");
  });
});

describe("getTypeStyle", () => {
  it("returns default body style", () => {
    const style = getTypeStyle("body");
    expect(style.fontSize).toBe(18);
    expect(style.fontName).toBe("Helvetica Neue");
  });

  it("applies overrides", () => {
    const style = getTypeStyle("body", { fontSize: 24, fontName: "Arial" });
    expect(style.fontSize).toBe(24);
    expect(style.fontName).toBe("Arial");
  });

  it("preserves non-overridden fields", () => {
    const style = getTypeStyle("heading", { fontSize: 30 });
    expect(style.fontSize).toBe(30);
    expect(style.fontWeight).toBe("bold"); // default heading weight preserved
  });
});
