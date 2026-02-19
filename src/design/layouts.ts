/**
 * Layout definitions and resolution for Keynote slides (US-005).
 *
 * A layout is a named collection of positioned elements (text, image, shape)
 * placed on a grid. The {@link resolveLayout} function converts abstract grid
 * areas into absolute Keynote-point rectangles ready for rendering.
 */

import type { Rect, DesignTokens } from "./tokens.js";
import type { TypeRole } from "./typography.js";
import { Grid } from "./grid.js";

// ---------------------------------------------------------------------------
// Element roles
// ---------------------------------------------------------------------------

/**
 * Semantic role an element plays on a slide.
 *
 * Extends {@link TypeRole} with non-text visual roles.
 */
export type ElementRole =
  | TypeRole
  | 'hero-image'
  | 'accent-shape'
  | 'divider'
  | 'background-shape';

// ---------------------------------------------------------------------------
// Layout element (abstract, grid-relative)
// ---------------------------------------------------------------------------

/** An element positioned in grid coordinates (not yet resolved to points). */
export interface LayoutElement {
  id: string;
  type: 'text' | 'image' | 'shape';
  role: ElementRole;
  gridArea: {
    colStart: number;
    colSpan: number;
    rowStart: number;
    rowSpan: number;
  };
  padding?: number;
  alignment?: 'left' | 'center' | 'right';
}

// ---------------------------------------------------------------------------
// Layout categories & definitions
// ---------------------------------------------------------------------------

/** High-level slide purpose. */
export type LayoutCategory =
  | 'title'
  | 'content'
  | 'section'
  | 'comparison'
  | 'media'
  | 'data'
  | 'quote'
  | 'closing';

/** A reusable slide layout template. */
export interface LayoutDefinition {
  name: string;
  description: string;
  category: LayoutCategory;
  elements: LayoutElement[];
  gridOverride?: {
    columns?: number;
    rows?: number;
    gutter?: number;
  };
}

// ---------------------------------------------------------------------------
// Resolved element (absolute point coordinates)
// ---------------------------------------------------------------------------

/** An element with its final position and size in Keynote points. */
export interface ResolvedElement {
  id: string;
  type: 'text' | 'image' | 'shape';
  role: ElementRole;
  rect: Rect;
  padding?: number;
  alignment?: 'left' | 'center' | 'right';
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a {@link LayoutDefinition} to absolute point positions.
 *
 * If the layout provides a `gridOverride`, a new grid is created from the
 * given tokens with those overrides applied; otherwise the supplied `grid`
 * is used directly.
 *
 * Element padding (if present) insets the resolved rect on all four sides.
 *
 * @param layout - The layout definition to resolve.
 * @param grid   - The base grid to position elements on.
 * @param tokens - Design tokens (used when a gridOverride requires a new grid).
 * @returns An array of resolved elements with absolute rects.
 */
export function resolveLayout(
  layout: LayoutDefinition,
  grid: Grid,
  tokens: DesignTokens,
): ResolvedElement[] {
  let activeGrid = grid;

  if (layout.gridOverride) {
    activeGrid = Grid.createGrid(tokens, {
      columns: layout.gridOverride.columns,
      rows: layout.gridOverride.rows,
      gutter: layout.gridOverride.gutter,
    });
  }

  return layout.elements.map((element): ResolvedElement => {
    const { colStart, colSpan, rowStart, rowSpan } = element.gridArea;
    let rect = activeGrid.getCell(colStart, colSpan, rowStart, rowSpan);

    // Apply element-level padding by insetting the rect on all sides.
    if (element.padding !== undefined && element.padding > 0) {
      const p = element.padding;
      rect = {
        x: rect.x + p,
        y: rect.y + p,
        width: rect.width - p * 2,
        height: rect.height - p * 2,
      };
    }

    const resolved: ResolvedElement = {
      id: element.id,
      type: element.type,
      role: element.role,
      rect,
    };

    if (element.padding !== undefined) {
      resolved.padding = element.padding;
    }

    if (element.alignment !== undefined) {
      resolved.alignment = element.alignment;
    }

    return resolved;
  });
}
