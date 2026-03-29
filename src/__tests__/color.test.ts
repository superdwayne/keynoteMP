import { describe, it, expect } from "vitest";
import {
  hexToHSL,
  hslToHex,
  getContrastRatio,
  ensureContrast,
  generatePalette,
  createPalette,
  autoAccent,
} from "../design/color.js";

describe("hexToHSL", () => {
  it("converts pure red", () => {
    const hsl = hexToHSL("#FF0000");
    expect(hsl).toEqual({ h: 0, s: 100, l: 50 });
  });

  it("converts pure green", () => {
    const hsl = hexToHSL("#00FF00");
    expect(hsl).toEqual({ h: 120, s: 100, l: 50 });
  });

  it("converts pure blue", () => {
    const hsl = hexToHSL("#0000FF");
    expect(hsl).toEqual({ h: 240, s: 100, l: 50 });
  });

  it("converts black", () => {
    const hsl = hexToHSL("#000000");
    expect(hsl).toEqual({ h: 0, s: 0, l: 0 });
  });

  it("converts white", () => {
    const hsl = hexToHSL("#FFFFFF");
    expect(hsl).toEqual({ h: 0, s: 0, l: 100 });
  });

  it("converts medium gray", () => {
    const hsl = hexToHSL("#808080");
    expect(hsl.s).toBe(0);
    expect(hsl.l).toBeCloseTo(50, 0);
  });

  it("throws on invalid hex", () => {
    expect(() => hexToHSL("#GG0000")).toThrow();
    expect(() => hexToHSL("#00")).toThrow();
  });
});

describe("hslToHex", () => {
  it("converts red HSL back to hex", () => {
    expect(hslToHex(0, 100, 50).toLowerCase()).toBe("#ff0000");
  });

  it("converts achromatic (gray)", () => {
    const hex = hslToHex(0, 0, 50).toLowerCase();
    expect(hex).toBe("#808080");
  });
});

describe("hexToHSL / hslToHex round-trip", () => {
  const testColors = ["#FF0000", "#00FF00", "#0000FF", "#FF8800", "#123456"];

  for (const color of testColors) {
    it(`round-trips ${color}`, () => {
      const hsl = hexToHSL(color);
      const roundTrip = hslToHex(hsl.h, hsl.s, hsl.l).toUpperCase();
      // Allow small rounding differences
      const hsl2 = hexToHSL(roundTrip);
      expect(hsl2.h).toBeCloseTo(hsl.h, 0);
      expect(hsl2.s).toBeCloseTo(hsl.s, 0);
      expect(hsl2.l).toBeCloseTo(hsl.l, 0);
    });
  }
});

describe("getContrastRatio", () => {
  it("returns 21 for black on white", () => {
    const ratio = getContrastRatio("#000000", "#FFFFFF");
    expect(ratio).toBeCloseTo(21, 0);
  });

  it("returns 1 for same color", () => {
    const ratio = getContrastRatio("#FF0000", "#FF0000");
    expect(ratio).toBeCloseTo(1, 1);
  });

  it("is symmetric", () => {
    const r1 = getContrastRatio("#333333", "#FFFFFF");
    const r2 = getContrastRatio("#FFFFFF", "#333333");
    expect(r1).toBeCloseTo(r2, 5);
  });
});

describe("ensureContrast", () => {
  it("returns foreground unchanged when contrast is sufficient", () => {
    const result = ensureContrast("#000000", "#FFFFFF", 4.5);
    expect(result).toBe("#000000");
  });

  it("adjusts foreground when contrast is insufficient", () => {
    const result = ensureContrast("#999999", "#AAAAAA", 4.5);
    const ratio = getContrastRatio(result, "#AAAAAA");
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("falls back to black or white for extreme cases", () => {
    const result = ensureContrast("#808080", "#808080", 21);
    expect(["#ffffff", "#000000"]).toContain(result.toLowerCase());
  });
});

describe("generatePalette", () => {
  const harmonies = [
    "complementary",
    "analogous",
    "triadic",
    "split-complementary",
    "monochromatic",
  ] as const;

  for (const harmony of harmonies) {
    it(`generates 5 colors for ${harmony}`, () => {
      const palette = generatePalette("#2B579A", harmony);
      expect(palette).toHaveLength(5);
      for (const color of palette) {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });
  }
});

describe("createPalette", () => {
  it("returns all required palette fields", () => {
    const palette = createPalette("#2B579A");
    expect(palette).toHaveProperty("primary");
    expect(palette).toHaveProperty("secondary");
    expect(palette).toHaveProperty("accent");
    expect(palette).toHaveProperty("background");
    expect(palette).toHaveProperty("surface");
    expect(palette).toHaveProperty("textPrimary");
    expect(palette).toHaveProperty("textSecondary");
    expect(palette).toHaveProperty("textOnPrimary");
  });

  it("preserves the primary color", () => {
    const palette = createPalette("#2B579A");
    expect(palette.primary).toBe("#2B579A");
  });

  it("generates dark mode palette", () => {
    const palette = createPalette("#2B579A", { dark: true });
    // Dark mode should have a dark background
    const bgHSL = hexToHSL(palette.background);
    expect(bgHSL.l).toBeLessThan(20);
  });
});

describe("autoAccent", () => {
  it("returns a valid hex color", () => {
    const accent = autoAccent("#2B579A");
    expect(accent).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("has minimum contrast against base", () => {
    const base = "#2B579A";
    const accent = autoAccent(base);
    const ratio = getContrastRatio(accent, base);
    expect(ratio).toBeGreaterThanOrEqual(3.0);
  });
});
