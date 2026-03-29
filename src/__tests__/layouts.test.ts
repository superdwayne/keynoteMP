import { describe, it, expect } from "vitest";
import { layoutLibrary } from "../design/layout-library.js";
import { resolveLayout } from "../design/layouts.js";
import { Grid } from "../design/grid.js";
import { defaultTokens } from "../design/tokens.js";

describe("layoutLibrary", () => {
  it("has at least 18 layouts", () => {
    expect(Object.keys(layoutLibrary).length).toBeGreaterThanOrEqual(18);
  });

  it("includes the 5 new business layouts", () => {
    expect(layoutLibrary["timeline"]).toBeDefined();
    expect(layoutLibrary["before-after"]).toBeDefined();
    expect(layoutLibrary["team-grid"]).toBeDefined();
    expect(layoutLibrary["pricing-table"]).toBeDefined();
    expect(layoutLibrary["roadmap"]).toBeDefined();
  });

  it("all layouts have required fields", () => {
    for (const [name, layout] of Object.entries(layoutLibrary)) {
      expect(layout.name, `${name} missing name`).toBeTruthy();
      expect(layout.description, `${name} missing description`).toBeTruthy();
      expect(layout.category, `${name} missing category`).toBeTruthy();
      expect(layout.elements.length, `${name} has no elements`).toBeGreaterThan(0);
    }
  });

  it("all elements have valid types", () => {
    const validTypes = new Set(["text", "image", "shape"]);
    for (const [name, layout] of Object.entries(layoutLibrary)) {
      for (const el of layout.elements) {
        expect(validTypes.has(el.type), `${name}/${el.id} has invalid type ${el.type}`).toBe(true);
      }
    }
  });
});

describe("resolveLayout", () => {
  const grid = Grid.createGrid(defaultTokens);

  it("resolves title-center to absolute positions", () => {
    const layout = layoutLibrary["title-center"];
    const resolved = resolveLayout(layout, grid, defaultTokens);
    expect(resolved.length).toBe(layout.elements.length);

    for (const el of resolved) {
      expect(el.rect.x).toBeGreaterThanOrEqual(0);
      expect(el.rect.y).toBeGreaterThanOrEqual(0);
      expect(el.rect.width).toBeGreaterThan(0);
      expect(el.rect.height).toBeGreaterThan(0);
    }
  });

  it("resolves all layouts without errors", () => {
    for (const [name, layout] of Object.entries(layoutLibrary)) {
      const resolved = resolveLayout(layout, grid, defaultTokens);
      expect(resolved.length, `${name} failed to resolve`).toBe(layout.elements.length);
    }
  });
});
