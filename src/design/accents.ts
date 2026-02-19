/**
 * Accent element generation for Keynote slide design (US-015).
 *
 * Generates decorative visual elements (lines, rectangles, circles) based on
 * the slide layout category and brand style. Accents add visual polish without
 * interfering with content.
 *
 * All coordinates are in Keynote points (1 pt = 1 px at 72 dpi).
 */

import type { Rect } from "./tokens.js";
import type { LayoutDefinition } from "./layouts.js";
import type { BrandConfig, BrandStyle } from "./brand.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A decorative accent element to render on a slide. */
export interface AccentElement {
  type: "line" | "rectangle" | "circle";
  rect: Rect;
  color: string;
  opacity?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default canvas dimensions (standard 4:3 Keynote presentation). */
const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 768;

/** Safe margins matching design tokens. */
const MARGIN_LEFT = 80;
const MARGIN_RIGHT = 80;
const MARGIN_TOP = 60;
const MARGIN_BOTTOM = 60;

/** Content area derived from canvas and margins. */
const CONTENT_X = MARGIN_LEFT;
const CONTENT_Y = MARGIN_TOP;
const CONTENT_WIDTH = CANVAS_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const CONTENT_HEIGHT = CANVAS_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

// ---------------------------------------------------------------------------
// Style configuration
// ---------------------------------------------------------------------------

interface StyleConfig {
  lineThickness: number;
  blockScale: number;
  defaultOpacity: number;
  preferCircles: boolean;
}

function getStyleConfig(style: BrandStyle): StyleConfig {
  switch (style) {
    case "minimal":
      return {
        lineThickness: 2,
        blockScale: 0.3,
        defaultOpacity: 0.2,
        preferCircles: false,
      };
    case "bold":
      return {
        lineThickness: 6,
        blockScale: 1.0,
        defaultOpacity: 1.0,
        preferCircles: false,
      };
    case "elegant":
      return {
        lineThickness: 1,
        blockScale: 0.5,
        defaultOpacity: 0.4,
        preferCircles: false,
      };
    case "corporate":
      return {
        lineThickness: 3,
        blockScale: 0.6,
        defaultOpacity: 0.8,
        preferCircles: false,
      };
    case "playful":
      return {
        lineThickness: 4,
        blockScale: 0.8,
        defaultOpacity: 1.0,
        preferCircles: true,
      };
  }
}

// ---------------------------------------------------------------------------
// Color resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the accent color from brand config.
 *
 * Style-specific overrides:
 * - **elegant**: prefers gold-toned accent; falls back to accentColor or primaryColor
 * - **corporate**: uses primaryColor for structured, conservative look
 * - All others: prefer accentColor, fall back to primaryColor
 */
function resolveAccentColor(brand: BrandConfig, style: BrandStyle): string {
  switch (style) {
    case "elegant":
      // Use the brand's accent (often gold/silver in elegant themes),
      // fall back to a warm gold if nothing is specified.
      return brand.accentColor ?? brand.primaryColor;
    case "corporate":
      return brand.primaryColor;
    default:
      return brand.accentColor ?? brand.primaryColor;
  }
}

// ---------------------------------------------------------------------------
// Category-specific accent generators
// ---------------------------------------------------------------------------

/**
 * Title layouts: accent line below the title area.
 */
function generateTitleAccents(
  color: string,
  config: StyleConfig,
  style: BrandStyle,
): AccentElement[] {
  const accents: AccentElement[] = [];

  // Horizontal accent line below the title zone (roughly 40% down from content top)
  const lineY = CONTENT_Y + CONTENT_HEIGHT * 0.4;
  const lineWidth = style === "bold"
    ? CONTENT_WIDTH * 0.5
    : CONTENT_WIDTH * 0.3;
  const lineX = style === "bold"
    ? CONTENT_X
    : CONTENT_X + (CONTENT_WIDTH - lineWidth) / 2;

  accents.push({
    type: "line",
    rect: {
      x: lineX,
      y: lineY,
      width: lineWidth,
      height: config.lineThickness,
    },
    color,
    opacity: config.defaultOpacity,
  });

  // Bold style: add a large color block behind the title
  if (style === "bold") {
    accents.push({
      type: "rectangle",
      rect: {
        x: 0,
        y: CONTENT_Y - 20,
        width: CANVAS_WIDTH,
        height: CONTENT_HEIGHT * 0.45,
      },
      color,
      opacity: 0.15,
    });
  }

  // Playful style: add decorative circle
  if (style === "playful") {
    accents.push({
      type: "circle",
      rect: {
        x: CANVAS_WIDTH - MARGIN_RIGHT - 80,
        y: CONTENT_Y + 20,
        width: 60,
        height: 60,
      },
      color,
      opacity: 0.8,
    });
  }

  return accents;
}

/**
 * Content layouts: accent bar at top or side.
 */
function generateContentAccents(
  color: string,
  config: StyleConfig,
  style: BrandStyle,
): AccentElement[] {
  const accents: AccentElement[] = [];

  if (style === "bold") {
    // Thick vertical accent bar on the left side
    accents.push({
      type: "rectangle",
      rect: {
        x: CONTENT_X - 20,
        y: CONTENT_Y,
        width: config.lineThickness * 2,
        height: CONTENT_HEIGHT,
      },
      color,
      opacity: config.defaultOpacity,
    });
  } else if (style === "playful") {
    // Bright circle accent in top-right corner
    accents.push({
      type: "circle",
      rect: {
        x: CANVAS_WIDTH - MARGIN_RIGHT - 48,
        y: CONTENT_Y - 16,
        width: 48,
        height: 48,
      },
      color,
      opacity: config.defaultOpacity,
    });
    // Small secondary circle
    accents.push({
      type: "circle",
      rect: {
        x: CANVAS_WIDTH - MARGIN_RIGHT - 90,
        y: CONTENT_Y + 24,
        width: 24,
        height: 24,
      },
      color,
      opacity: 0.5,
    });
  } else {
    // Horizontal accent bar across the top of the content area
    accents.push({
      type: "line",
      rect: {
        x: CONTENT_X,
        y: CONTENT_Y - 8,
        width: CONTENT_WIDTH,
        height: config.lineThickness,
      },
      color,
      opacity: config.defaultOpacity,
    });
  }

  return accents;
}

/**
 * Quote layouts: large quote-mark shape and subtle accent.
 */
function generateQuoteAccents(
  color: string,
  config: StyleConfig,
  style: BrandStyle,
): AccentElement[] {
  const accents: AccentElement[] = [];

  // Large decorative rectangle representing an oversized quote mark region.
  // Positioned in the upper-left of the content area.
  const quoteSize = style === "bold" ? 80 : 60;
  accents.push({
    type: "rectangle",
    rect: {
      x: CONTENT_X,
      y: CONTENT_Y,
      width: quoteSize,
      height: quoteSize,
    },
    color,
    opacity: style === "bold" ? 0.3 : 0.15,
  });

  // Vertical accent line to the left of the quote text area
  accents.push({
    type: "line",
    rect: {
      x: CONTENT_X + quoteSize + 16,
      y: CONTENT_Y + 8,
      width: config.lineThickness,
      height: CONTENT_HEIGHT * 0.5,
    },
    color,
    opacity: config.defaultOpacity,
  });

  // Playful: add a decorative circle
  if (config.preferCircles) {
    accents.push({
      type: "circle",
      rect: {
        x: CANVAS_WIDTH - MARGIN_RIGHT - 60,
        y: CANVAS_HEIGHT - MARGIN_BOTTOM - 60,
        width: 40,
        height: 40,
      },
      color,
      opacity: 0.6,
    });
  }

  return accents;
}

/**
 * Section layouts: accent line to visually separate sections.
 */
function generateSectionAccents(
  color: string,
  config: StyleConfig,
  style: BrandStyle,
): AccentElement[] {
  const accents: AccentElement[] = [];

  // Horizontal accent line centered vertically
  const lineWidth = style === "minimal"
    ? CONTENT_WIDTH * 0.2
    : CONTENT_WIDTH * 0.4;
  const lineX = CONTENT_X + (CONTENT_WIDTH - lineWidth) / 2;
  const lineY = CONTENT_Y + CONTENT_HEIGHT * 0.55;

  accents.push({
    type: "line",
    rect: {
      x: lineX,
      y: lineY,
      width: lineWidth,
      height: config.lineThickness,
    },
    color,
    opacity: config.defaultOpacity,
  });

  // Bold: full-width background block
  if (style === "bold") {
    accents.push({
      type: "rectangle",
      rect: {
        x: 0,
        y: 0,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
      },
      color,
      opacity: 0.08,
    });
  }

  // Playful: circle accent
  if (config.preferCircles) {
    accents.push({
      type: "circle",
      rect: {
        x: CONTENT_X + CONTENT_WIDTH - 50,
        y: CONTENT_Y + 20,
        width: 36,
        height: 36,
      },
      color,
      opacity: 0.7,
    });
  }

  return accents;
}

/**
 * Closing layouts: accent line above the text area.
 */
function generateClosingAccents(
  color: string,
  config: StyleConfig,
  style: BrandStyle,
): AccentElement[] {
  const accents: AccentElement[] = [];

  // Horizontal accent line above the closing text
  const lineWidth = style === "bold"
    ? CONTENT_WIDTH * 0.5
    : CONTENT_WIDTH * 0.25;
  const lineX = CONTENT_X + (CONTENT_WIDTH - lineWidth) / 2;
  const lineY = CONTENT_Y + CONTENT_HEIGHT * 0.35;

  accents.push({
    type: "line",
    rect: {
      x: lineX,
      y: lineY,
      width: lineWidth,
      height: config.lineThickness,
    },
    color,
    opacity: config.defaultOpacity,
  });

  // Bold: add a rectangular block at the bottom
  if (style === "bold") {
    accents.push({
      type: "rectangle",
      rect: {
        x: 0,
        y: CANVAS_HEIGHT - 40,
        width: CANVAS_WIDTH,
        height: 40,
      },
      color,
      opacity: 0.6,
    });
  }

  // Playful: corner circles
  if (config.preferCircles) {
    accents.push({
      type: "circle",
      rect: {
        x: CONTENT_X,
        y: CANVAS_HEIGHT - MARGIN_BOTTOM - 44,
        width: 32,
        height: 32,
      },
      color,
      opacity: 0.5,
    });
    accents.push({
      type: "circle",
      rect: {
        x: CONTENT_X + CONTENT_WIDTH - 32,
        y: CANVAS_HEIGHT - MARGIN_BOTTOM - 44,
        width: 32,
        height: 32,
      },
      color,
      opacity: 0.5,
    });
  }

  return accents;
}

/**
 * Default/other categories: minimal accent treatment.
 */
function generateDefaultAccents(
  color: string,
  config: StyleConfig,
): AccentElement[] {
  const accents: AccentElement[] = [];

  // Subtle thin line at the bottom of the content area
  accents.push({
    type: "line",
    rect: {
      x: CONTENT_X,
      y: CONTENT_Y + CONTENT_HEIGHT,
      width: CONTENT_WIDTH,
      height: Math.max(config.lineThickness - 1, 1),
    },
    color,
    opacity: Math.min(config.defaultOpacity, 0.2),
  });

  return accents;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate decorative accent elements for a slide layout.
 *
 * Produces an array of {@link AccentElement} shapes positioned to complement
 * the given layout category and styled according to the brand configuration.
 *
 * The function adapts accent density, weight, color, and opacity based on the
 * {@link BrandStyle}:
 *
 * - **minimal** -- thin 2pt lines, muted colors at low opacity (~0.2)
 * - **bold** -- thick color blocks, large rectangles, full opacity
 * - **elegant** -- delicate 1pt lines, accent color at ~0.4 opacity
 * - **corporate** -- clean structured lines using primary color
 * - **playful** -- rounded circles, bright pops at full opacity
 *
 * @param layout - The layout definition whose category drives accent placement.
 * @param brand  - Brand configuration providing colors.
 * @param style  - The visual style preset controlling accent weight and density.
 * @returns An array of accent elements ready for rendering.
 */
export function generateAccents(
  layout: LayoutDefinition,
  brand: BrandConfig,
  style: BrandStyle,
): AccentElement[] {
  const config = getStyleConfig(style);
  const color = resolveAccentColor(brand, style);

  switch (layout.category) {
    case "title":
      return generateTitleAccents(color, config, style);
    case "content":
      return generateContentAccents(color, config, style);
    case "quote":
      return generateQuoteAccents(color, config, style);
    case "section":
      return generateSectionAccents(color, config, style);
    case "closing":
      return generateClosingAccents(color, config, style);
    case "comparison":
    case "media":
    case "data":
      return generateDefaultAccents(color, config);
  }
}
