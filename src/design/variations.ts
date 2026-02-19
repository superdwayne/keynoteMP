/**
 * Layout variation and selection engine (US-019).
 *
 * Provides two key capabilities:
 *
 * 1. {@link generateVariation} -- Creates visual variations of a base layout
 *    by mirroring, shifting proportions, or toggling alignment, producing
 *    visual diversity without authoring entirely new layouts.
 *
 * 2. {@link selectLayout} -- Picks the most appropriate layout from the
 *    library based on slide content, avoiding recently-used layouts to
 *    maintain visual variety across a deck.
 */

import type { LayoutDefinition, LayoutElement } from "./layouts.js";
import { layoutLibrary } from "./layout-library.js";

// ---------------------------------------------------------------------------
// SlideContent
// ---------------------------------------------------------------------------

/** Content payload for a single slide, used by {@link selectLayout}. */
export interface SlideContent {
  title?: string;
  subtitle?: string;
  body?: string;
  bodyItems?: string[];
  quote?: string;
  attribution?: string;
  imagePaths?: string[];
  stats?: { value: string; label: string }[];
}

// ---------------------------------------------------------------------------
// Simple seeded PRNG (Mulberry32)
// ---------------------------------------------------------------------------

/**
 * Mulberry32 -- fast 32-bit seeded PRNG.
 * Returns a function that yields floats in [0, 1) on each call.
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Variation strategies
// ---------------------------------------------------------------------------

/** The total number of columns in the default grid. */
const DEFAULT_TOTAL_COLS = 12;

/**
 * Mirror strategy: swap left/right by reflecting each element's column
 * position across the grid's horizontal center.
 *
 * For an element at colStart with colSpan, the mirrored position is:
 *   newColStart = totalCols - colStart - colSpan
 */
function mirrorLayout(layout: LayoutDefinition): LayoutDefinition {
  const totalCols =
    layout.gridOverride?.columns ?? DEFAULT_TOTAL_COLS;

  return {
    ...layout,
    name: `${layout.name}-mirrored`,
    description: `${layout.description} (mirrored)`,
    elements: layout.elements.map(
      (el): LayoutElement => ({
        ...el,
        gridArea: {
          ...el.gridArea,
          colStart: totalCols - el.gridArea.colStart - el.gridArea.colSpan,
        },
      }),
    ),
  };
}

/**
 * Proportion-shift strategy: adjust colSpan by +-1 for major content areas
 * (elements spanning 4+ columns). The adjustment direction is chosen via
 * the provided random function.
 *
 * Guards ensure colSpan stays >= 1 and colStart + colSpan <= totalCols.
 */
function shiftProportions(
  layout: LayoutDefinition,
  rand: () => number,
): LayoutDefinition {
  const totalCols =
    layout.gridOverride?.columns ?? DEFAULT_TOTAL_COLS;

  return {
    ...layout,
    name: `${layout.name}-shifted`,
    description: `${layout.description} (proportion shifted)`,
    elements: layout.elements.map(
      (el): LayoutElement => {
        const { colStart, colSpan } = el.gridArea;

        // Only adjust elements spanning 4+ columns (major content areas).
        if (colSpan < 4) return el;

        const delta = rand() < 0.5 ? -1 : 1;
        let newColSpan = colSpan + delta;

        // Clamp: at least 1, and must fit within the grid.
        newColSpan = Math.max(1, newColSpan);
        if (colStart + newColSpan > totalCols) {
          newColSpan = totalCols - colStart;
        }

        return {
          ...el,
          gridArea: {
            ...el.gridArea,
            colSpan: newColSpan,
          },
        };
      },
    ),
  };
}

/**
 * Alignment-toggle strategy: swap left <-> center alignment on text elements.
 * Elements with no alignment or with 'right' alignment are left unchanged.
 */
function toggleAlignment(layout: LayoutDefinition): LayoutDefinition {
  return {
    ...layout,
    name: `${layout.name}-realigned`,
    description: `${layout.description} (alignment toggled)`,
    elements: layout.elements.map(
      (el): LayoutElement => {
        if (el.alignment === "left") {
          return { ...el, alignment: "center" };
        }
        if (el.alignment === "center") {
          return { ...el, alignment: "left" };
        }
        return el;
      },
    ),
  };
}

// ---------------------------------------------------------------------------
// generateVariation
// ---------------------------------------------------------------------------

/** Available variation strategies, indexed 0-2. */
const STRATEGIES = [mirrorLayout, shiftProportions, toggleAlignment] as const;

/**
 * Create a layout variation from a base layout.
 *
 * The `seed` deterministically selects which variation strategy to apply:
 *   - 0 mod 3 = mirror (swap left/right)
 *   - 1 mod 3 = proportion shift (colSpan +/-1 on wide elements)
 *   - 2 mod 3 = alignment toggle (left <-> center)
 *
 * When no seed is provided, a strategy is chosen at random.
 *
 * @param baseLayout - The layout to vary.
 * @param seed       - Optional deterministic seed (default: random).
 * @returns A new {@link LayoutDefinition} with the variation applied.
 */
export function generateVariation(
  baseLayout: LayoutDefinition,
  seed?: number,
): LayoutDefinition {
  const rand = seed !== undefined
    ? mulberry32(seed)
    : () => Math.random();

  const strategyIndex = seed !== undefined
    ? Math.abs(seed) % STRATEGIES.length
    : Math.floor(rand() * STRATEGIES.length);

  const strategy = STRATEGIES[strategyIndex];

  // shiftProportions needs the rand function; others ignore it.
  if (strategyIndex === 1) {
    return (strategy as typeof shiftProportions)(baseLayout, rand);
  }

  return (strategy as typeof mirrorLayout)(baseLayout);
}

// ---------------------------------------------------------------------------
// selectLayout
// ---------------------------------------------------------------------------

/**
 * Auto-detect the best layout category from slide content.
 *
 * Priority order: media (has images) > data (has stats) > quote > content.
 */
function detectCategory(content: SlideContent): LayoutDefinition["category"] {
  if (content.imagePaths && content.imagePaths.length > 0) return "media";
  if (content.stats && content.stats.length > 0) return "data";
  if (content.quote) return "quote";
  return "content";
}

/**
 * Select the best layout for the given slide content.
 *
 * Selection logic:
 * 1. If `category` is provided, filter the library to that category.
 *    Otherwise, auto-detect from the content payload.
 * 2. Exclude layouts whose names appear in `previousLayouts` to avoid
 *    visual repetition across consecutive slides.
 * 3. Pick the first remaining layout, or fall back to 'content-left',
 *    then 'blank-canvas' if everything was filtered out.
 *
 * @param content         - The slide's content payload.
 * @param previousLayouts - Names of recently-used layouts to avoid.
 * @param category        - Optional explicit category override.
 * @returns The selected {@link LayoutDefinition}.
 */
export function selectLayout(
  content: SlideContent,
  previousLayouts: string[],
  category?: string,
): LayoutDefinition {
  const targetCategory = category ?? detectCategory(content);
  const allLayouts = Object.values(layoutLibrary);

  // Filter to the target category.
  const categoryMatches = allLayouts.filter(
    (l) => l.category === targetCategory,
  );

  // Exclude previously-used layouts.
  const candidates = categoryMatches.filter(
    (l) => !previousLayouts.includes(l.name),
  );

  // Return first candidate if available.
  if (candidates.length > 0) {
    return candidates[0];
  }

  // All layouts in the category were previously used -- allow repeats.
  if (categoryMatches.length > 0) {
    return categoryMatches[0];
  }

  // Category had no layouts at all -- fall back.
  if (layoutLibrary["content-left"]) return layoutLibrary["content-left"];
  if (layoutLibrary["blank-canvas"]) return layoutLibrary["blank-canvas"];

  // Ultimate fallback: return a minimal blank layout.
  return {
    name: "blank-canvas",
    description: "Empty fallback layout",
    category: "content",
    elements: [],
  };
}
