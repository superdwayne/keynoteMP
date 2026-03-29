import { describe, it, expect } from "vitest";
import { Grid, alignElement, distributeElements } from "../design/grid.js";
import { defaultTokens } from "../design/tokens.js";

describe("Grid", () => {
  const grid = Grid.createGrid(defaultTokens);

  it("creates a grid from default tokens", () => {
    const area = grid.getContentArea();
    expect(area.width).toBeGreaterThan(0);
    expect(area.height).toBeGreaterThan(0);
  });

  it("returns valid rect for first cell", () => {
    const cell = grid.getCell(0, 1, 0, 1);
    expect(cell.x).toBeGreaterThanOrEqual(0);
    expect(cell.y).toBeGreaterThanOrEqual(0);
    expect(cell.width).toBeGreaterThan(0);
    expect(cell.height).toBeGreaterThan(0);
  });

  it("multi-span cell is wider than single-span", () => {
    const single = grid.getCell(0, 1, 0, 1);
    const double = grid.getCell(0, 2, 0, 1);
    expect(double.width).toBeGreaterThan(single.width);
  });

  it("full-width cell matches content area width", () => {
    const full = grid.getCell(0, 12, 0, 1);
    const area = grid.getContentArea();
    expect(full.width).toBeCloseTo(area.width, 0);
  });

  it("getCenterRect centers correctly", () => {
    const area = grid.getContentArea();
    const centered = grid.getCenterRect(100, 50);
    expect(centered.x).toBeCloseTo(area.x + (area.width - 100) / 2, 1);
    expect(centered.y).toBeCloseTo(area.y + (area.height - 50) / 2, 1);
  });
});

describe("alignElement", () => {
  const container = { x: 0, y: 0, width: 1000, height: 500 };
  const elem = { x: 0, y: 0, width: 100, height: 50 };

  it("aligns start on x-axis", () => {
    const result = alignElement(elem, container, "start", "x");
    expect(result.x).toBe(0);
  });

  it("aligns center on x-axis", () => {
    const result = alignElement(elem, container, "center", "x");
    expect(result.x).toBeCloseTo(450, 0);
  });

  it("aligns end on x-axis", () => {
    const result = alignElement(elem, container, "end", "x");
    expect(result.x).toBeCloseTo(900, 0);
  });

  it("aligns center on y-axis", () => {
    const result = alignElement(elem, container, "center", "y");
    expect(result.y).toBeCloseTo(225, 0);
  });
});

describe("distributeElements", () => {
  const container = { x: 0, y: 0, width: 1000, height: 100 };

  it("distributes with fixed gap", () => {
    const rects = [
      { x: 0, y: 0, width: 100, height: 50 },
      { x: 0, y: 0, width: 100, height: 50 },
    ];
    const result = distributeElements(rects, container, "x", 20);
    expect(result[0].x).toBe(0);
    expect(result[1].x).toBe(120); // 100 + 20 gap
  });

  it("distributes evenly (space-evenly)", () => {
    const rects = [
      { x: 0, y: 0, width: 100, height: 50 },
      { x: 0, y: 0, width: 100, height: 50 },
    ];
    const result = distributeElements(rects, container, "x");
    // 1000 - 200 = 800 remaining, split into 3 gaps = ~266.67 each
    const gap = (1000 - 200) / 3;
    expect(result[0].x).toBeCloseTo(gap, 0);
    expect(result[1].x).toBeCloseTo(gap + 100 + gap, 0);
  });

  it("returns empty array for empty input", () => {
    expect(distributeElements([], container, "x")).toEqual([]);
  });
});
