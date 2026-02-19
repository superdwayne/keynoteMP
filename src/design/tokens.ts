/**
 * Design tokens for Keynote slide layout engine (US-001).
 *
 * All numeric values are in Keynote points (1 pt = 1 px at 72 dpi).
 * Spacing follows an 8-point grid scale.
 */

// ---------------------------------------------------------------------------
// Geometry primitives
// ---------------------------------------------------------------------------

/** Axis-aligned rectangle in Keynote point space. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Token interfaces
// ---------------------------------------------------------------------------

export interface DesignTokens {
  /** Presentation canvas dimensions. */
  canvas: {
    width: number;
    height: number;
  };

  /**
   * 8-point spacing scale.
   *
   * | key   | pts |
   * |-------|-----|
   * | xs    |   8 |
   * | sm    |  16 |
   * | md    |  24 |
   * | lg    |  32 |
   * | xl    |  48 |
   * | xxl   |  64 |
   * | xxxl  |  96 |
   */
  spacing: Record<string, number>;

  /** Safe margins inset from the canvas edges. */
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };

  /**
   * Usable content area after margins are applied.
   * Derived: `{ x: margins.left, y: margins.top,
   *            width: canvas.width - margins.left - margins.right,
   *            height: canvas.height - margins.top - margins.bottom }`
   */
  contentArea: Rect;
}

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const SPACING: Record<string, number> = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
  xxl: 64,
  xxxl: 96,
} as const;

const MARGINS = {
  top: 60,
  bottom: 60,
  left: 80,
  right: 80,
} as const;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function buildTokens(
  canvasWidth: number,
  canvasHeight: number,
  margins: DesignTokens["margins"] = MARGINS,
): DesignTokens {
  return {
    canvas: {
      width: canvasWidth,
      height: canvasHeight,
    },
    spacing: { ...SPACING },
    margins: { ...margins },
    contentArea: {
      x: margins.left,
      y: margins.top,
      width: canvasWidth - margins.left - margins.right,
      height: canvasHeight - margins.top - margins.bottom,
    },
  };
}

// ---------------------------------------------------------------------------
// Preset token sets
// ---------------------------------------------------------------------------

/** Standard 4:3 presentation (1024 x 768). */
export const defaultTokens: DesignTokens = buildTokens(1024, 768);

/** Widescreen 16:9 presentation (1920 x 1080). */
export const widescreenTokens: DesignTokens = buildTokens(1920, 1080);
