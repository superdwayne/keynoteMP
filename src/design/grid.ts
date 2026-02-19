/**
 * Grid layout engine for Keynote slide positioning (US-004).
 *
 * Provides a column/row grid system positioned within the content area
 * (after margins), plus alignment and distribution utilities.
 * All values are in Keynote points (1 pt = 1 px at 72 dpi).
 */

import { Rect, DesignTokens } from "./tokens.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Configuration for the grid layout. */
export interface GridConfig {
  columns: number;
  rows: number;
  gutter: number;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

/** Default grid: 12 columns, 8 rows, 16 pt gutter. */
const DEFAULT_GRID_CONFIG: GridConfig = {
  columns: 12,
  rows: 8,
  gutter: 16,
  margins: { top: 0, bottom: 0, left: 0, right: 0 },
};

// ---------------------------------------------------------------------------
// Grid class
// ---------------------------------------------------------------------------

/** A column/row grid positioned within the design-token content area. */
export class Grid {
  private readonly tokens: DesignTokens;
  private readonly config: GridConfig;

  /** The area the grid occupies (content area inset by grid margins). */
  private readonly area: Rect;

  /** Width of a single column (excluding gutters). */
  private readonly colWidth: number;

  /** Height of a single row (excluding gutters). */
  private readonly rowHeight: number;

  private constructor(tokens: DesignTokens, config: GridConfig) {
    this.tokens = tokens;
    this.config = config;

    // The grid lives inside the content area, further inset by its own margins.
    const ca = tokens.contentArea;
    this.area = {
      x: ca.x + config.margins.left,
      y: ca.y + config.margins.top,
      width: ca.width - config.margins.left - config.margins.right,
      height: ca.height - config.margins.top - config.margins.bottom,
    };

    // Usable space after removing gutters between columns/rows.
    const totalColGutter = config.gutter * (config.columns - 1);
    const totalRowGutter = config.gutter * (config.rows - 1);

    this.colWidth = (this.area.width - totalColGutter) / config.columns;
    this.rowHeight = (this.area.height - totalRowGutter) / config.rows;
  }

  // -----------------------------------------------------------------------
  // Factory
  // -----------------------------------------------------------------------

  /**
   * Create a new Grid from design tokens and an optional partial config.
   * Unspecified config values fall back to defaults (12 col, 8 row, 16 pt gutter).
   */
  static createGrid(
    tokens: DesignTokens,
    config?: Partial<GridConfig>,
  ): Grid {
    const merged: GridConfig = {
      ...DEFAULT_GRID_CONFIG,
      ...config,
      margins: {
        ...DEFAULT_GRID_CONFIG.margins,
        ...config?.margins,
      },
    };
    return new Grid(tokens, merged);
  }

  // -----------------------------------------------------------------------
  // Cell lookup
  // -----------------------------------------------------------------------

  /**
   * Return the bounding rect for a range of grid cells.
   *
   * @param colStart  0-based column index
   * @param colSpan   number of columns to span (>= 1)
   * @param rowStart  0-based row index
   * @param rowSpan   number of rows to span (>= 1)
   */
  getCell(
    colStart: number,
    colSpan: number,
    rowStart: number,
    rowSpan: number,
  ): Rect {
    const x =
      this.area.x +
      colStart * (this.colWidth + this.config.gutter);

    const y =
      this.area.y +
      rowStart * (this.rowHeight + this.config.gutter);

    const width =
      colSpan * this.colWidth + (colSpan - 1) * this.config.gutter;

    const height =
      rowSpan * this.rowHeight + (rowSpan - 1) * this.config.gutter;

    return { x, y, width, height };
  }

  // -----------------------------------------------------------------------
  // Convenience helpers
  // -----------------------------------------------------------------------

  /**
   * Return a rect of the given size centered within the grid area.
   */
  getCenterRect(width: number, height: number): Rect {
    return {
      x: this.area.x + (this.area.width - width) / 2,
      y: this.area.y + (this.area.height - height) / 2,
      width,
      height,
    };
  }

  /**
   * Return the full usable area within the grid margins (the area the grid
   * columns and rows occupy).
   */
  getContentArea(): Rect {
    return { ...this.area };
  }
}

// ---------------------------------------------------------------------------
// Standalone alignment utilities
// ---------------------------------------------------------------------------

/**
 * Align an element rect within a container along a single axis.
 *
 * - `start`  -- flush to the leading edge
 * - `center` -- centered
 * - `end`    -- flush to the trailing edge
 *
 * The returned rect has the same size; only position changes.
 */
export function alignElement(
  rect: Rect,
  container: Rect,
  alignment: "start" | "center" | "end",
  axis: "x" | "y",
): Rect {
  const result = { ...rect };
  const containerPos = axis === "x" ? container.x : container.y;
  const containerSize = axis === "x" ? container.width : container.height;
  const elemSize = axis === "x" ? rect.width : rect.height;

  let pos: number;
  switch (alignment) {
    case "start":
      pos = containerPos;
      break;
    case "center":
      pos = containerPos + (containerSize - elemSize) / 2;
      break;
    case "end":
      pos = containerPos + containerSize - elemSize;
      break;
  }

  if (axis === "x") {
    result.x = pos;
  } else {
    result.y = pos;
  }

  return result;
}

/**
 * Distribute a list of rects evenly within a container along a single axis.
 *
 * If `gap` is provided, elements are placed sequentially with that fixed gap
 * between them (starting from the container's leading edge).
 *
 * If `gap` is omitted, elements are spaced so that the gaps between them
 * (and the outer edges) are equal -- i.e. "space-evenly" distribution.
 *
 * The returned rects have the same sizes; only positions along `axis` change.
 * Positions along the other axis are preserved.
 */
export function distributeElements(
  rects: Rect[],
  container: Rect,
  axis: "x" | "y",
  gap?: number,
): Rect[] {
  if (rects.length === 0) return [];

  const posKey = axis; // "x" or "y"
  const sizeKey = axis === "x" ? "width" : "height";
  const containerPos = container[posKey];
  const containerSize = container[sizeKey];

  if (gap !== undefined) {
    // Fixed-gap mode: place elements sequentially from the leading edge.
    let cursor = containerPos;
    return rects.map((r) => {
      const placed = { ...r, [posKey]: cursor };
      cursor += r[sizeKey] + gap;
      return placed;
    });
  }

  // Space-evenly mode: equal gaps between all elements and outer edges.
  const totalElemSize = rects.reduce((sum, r) => sum + r[sizeKey], 0);
  const totalGap = containerSize - totalElemSize;
  const evenGap = totalGap / (rects.length + 1);

  let cursor = containerPos + evenGap;
  return rects.map((r) => {
    const placed = { ...r, [posKey]: cursor };
    cursor += r[sizeKey] + evenGap;
    return placed;
  });
}
