/**
 * Built-in layout library for Keynote slide generation (US-006, US-007, US-008).
 *
 * Provides a curated set of ready-to-use slide layouts covering common
 * presentation patterns: title slides, content layouts, media-heavy slides,
 * data visualizations, quotes, and closing slides.
 *
 * All layouts use a 12-column, 8-row grid with 0-based coordinates.
 */

import type { LayoutDefinition } from "./layouts.js";

// ============================================================================
// US-006  Title & Section Layouts
// ============================================================================

/**
 * Centered title with subtitle below and optional accent line.
 * Classic, balanced title slide for opening or topic transitions.
 */
const titleCenter: LayoutDefinition = {
  name: "title-center",
  description: "Centered title with subtitle and accent line",
  category: "title",
  elements: [
    {
      id: "title",
      type: "text",
      role: "display",
      gridArea: { colStart: 2, colSpan: 8, rowStart: 2, rowSpan: 2 },
      alignment: "center",
    },
    {
      id: "accent-line",
      type: "shape",
      role: "accent-shape",
      gridArea: { colStart: 5, colSpan: 2, rowStart: 4, rowSpan: 1 },
    },
    {
      id: "subtitle",
      type: "text",
      role: "subheading",
      gridArea: { colStart: 3, colSpan: 6, rowStart: 5, rowSpan: 1 },
      alignment: "center",
    },
  ],
};

/**
 * Left-aligned title with a right accent/image zone.
 * Good for branded title slides with a visual on the right.
 */
const titleLeft: LayoutDefinition = {
  name: "title-left",
  description: "Left-aligned title with right accent/image zone",
  category: "title",
  elements: [
    {
      id: "title",
      type: "text",
      role: "display",
      gridArea: { colStart: 1, colSpan: 6, rowStart: 2, rowSpan: 2 },
      alignment: "left",
    },
    {
      id: "subtitle",
      type: "text",
      role: "subheading",
      gridArea: { colStart: 1, colSpan: 6, rowStart: 4, rowSpan: 1 },
      alignment: "left",
    },
    {
      id: "accent-image",
      type: "image",
      role: "hero-image",
      gridArea: { colStart: 7, colSpan: 4, rowStart: 1, rowSpan: 6 },
      padding: 8,
    },
  ],
};

/**
 * Bold full-bleed title with large centered display text.
 * Uses a background shape for a strong color fill behind the text.
 */
const titleBold: LayoutDefinition = {
  name: "title-bold",
  description: "Full-bleed background color with large centered display text",
  category: "title",
  elements: [
    {
      id: "background",
      type: "shape",
      role: "background-shape",
      gridArea: { colStart: 0, colSpan: 12, rowStart: 0, rowSpan: 8 },
    },
    {
      id: "title",
      type: "text",
      role: "display",
      gridArea: { colStart: 2, colSpan: 8, rowStart: 2, rowSpan: 3 },
      alignment: "center",
    },
    {
      id: "subtitle",
      type: "text",
      role: "caption",
      gridArea: { colStart: 3, colSpan: 6, rowStart: 5, rowSpan: 1 },
      alignment: "center",
    },
  ],
};

/**
 * Section break with large centered heading and thin accent line.
 * Marks a new section or topic within the presentation.
 */
const sectionBreak: LayoutDefinition = {
  name: "section-break",
  description: "Large centered heading with accent line and optional section number",
  category: "section",
  elements: [
    {
      id: "section-number",
      type: "text",
      role: "overline",
      gridArea: { colStart: 4, colSpan: 4, rowStart: 2, rowSpan: 1 },
      alignment: "center",
    },
    {
      id: "heading",
      type: "text",
      role: "heading",
      gridArea: { colStart: 2, colSpan: 8, rowStart: 3, rowSpan: 2 },
      alignment: "center",
    },
    {
      id: "accent-line",
      type: "shape",
      role: "divider",
      gridArea: { colStart: 5, colSpan: 2, rowStart: 5, rowSpan: 1 },
    },
  ],
};

/**
 * Section slide with gradient background and contrasting heading.
 * Full-bleed gradient shape behind a centered heading.
 */
const sectionGradient: LayoutDefinition = {
  name: "section-gradient",
  description: "Heading on gradient background with contrasting text",
  category: "section",
  elements: [
    {
      id: "gradient-bg",
      type: "shape",
      role: "background-shape",
      gridArea: { colStart: 0, colSpan: 12, rowStart: 0, rowSpan: 8 },
    },
    {
      id: "heading",
      type: "text",
      role: "display",
      gridArea: { colStart: 2, colSpan: 8, rowStart: 3, rowSpan: 2 },
      alignment: "center",
    },
  ],
};

// ============================================================================
// US-007  Content & Media Layouts
// ============================================================================

/**
 * Content slide with heading top-left and body text below.
 * Standard workhorse layout for text-heavy content.
 */
const contentLeft: LayoutDefinition = {
  name: "content-left",
  description: "Heading top-left with body text below spanning 8 columns",
  category: "content",
  elements: [
    {
      id: "heading",
      type: "text",
      role: "heading",
      gridArea: { colStart: 1, colSpan: 8, rowStart: 1, rowSpan: 1 },
      alignment: "left",
    },
    {
      id: "body",
      type: "text",
      role: "body",
      gridArea: { colStart: 1, colSpan: 8, rowStart: 2, rowSpan: 5 },
      alignment: "left",
      padding: 4,
    },
  ],
};

/**
 * Content with text on left and image on right.
 * Heading and body span 6 columns; image takes 5 columns on the right.
 */
const contentRightImage: LayoutDefinition = {
  name: "content-right-image",
  description: "Heading + body left, image right",
  category: "content",
  elements: [
    {
      id: "heading",
      type: "text",
      role: "heading",
      gridArea: { colStart: 1, colSpan: 6, rowStart: 1, rowSpan: 1 },
      alignment: "left",
    },
    {
      id: "body",
      type: "text",
      role: "body",
      gridArea: { colStart: 1, colSpan: 6, rowStart: 2, rowSpan: 5 },
      alignment: "left",
      padding: 4,
    },
    {
      id: "image",
      type: "image",
      role: "hero-image",
      gridArea: { colStart: 7, colSpan: 5, rowStart: 1, rowSpan: 6 },
      padding: 8,
    },
  ],
};

/**
 * Content with image on left and text on right.
 * Mirror of content-right-image.
 */
const contentLeftImage: LayoutDefinition = {
  name: "content-left-image",
  description: "Image left, heading + body right",
  category: "content",
  elements: [
    {
      id: "image",
      type: "image",
      role: "hero-image",
      gridArea: { colStart: 0, colSpan: 5, rowStart: 1, rowSpan: 6 },
      padding: 8,
    },
    {
      id: "heading",
      type: "text",
      role: "heading",
      gridArea: { colStart: 6, colSpan: 6, rowStart: 1, rowSpan: 1 },
      alignment: "left",
    },
    {
      id: "body",
      type: "text",
      role: "body",
      gridArea: { colStart: 6, colSpan: 6, rowStart: 2, rowSpan: 5 },
      alignment: "left",
      padding: 4,
    },
  ],
};

/**
 * Two-column layout with heading across the top and two equal body columns.
 * Columns span 5 cols each with a 2-col gutter between them.
 */
const twoColumn: LayoutDefinition = {
  name: "two-column",
  description: "Heading top, two equal body columns below",
  category: "content",
  elements: [
    {
      id: "heading",
      type: "text",
      role: "heading",
      gridArea: { colStart: 1, colSpan: 10, rowStart: 1, rowSpan: 1 },
      alignment: "left",
    },
    {
      id: "col-left",
      type: "text",
      role: "body",
      gridArea: { colStart: 1, colSpan: 5, rowStart: 2, rowSpan: 5 },
      alignment: "left",
      padding: 4,
    },
    {
      id: "col-right",
      type: "text",
      role: "body",
      gridArea: { colStart: 7, colSpan: 5, rowStart: 2, rowSpan: 5 },
      alignment: "left",
      padding: 4,
    },
  ],
};

/**
 * Three-column layout with heading across the top and three equal columns.
 * Each column spans 3 cols (columns 1-3, 5-7, 9-11) with 1-col gutters.
 */
const threeColumn: LayoutDefinition = {
  name: "three-column",
  description: "Heading top, three equal columns below",
  category: "content",
  elements: [
    {
      id: "heading",
      type: "text",
      role: "heading",
      gridArea: { colStart: 1, colSpan: 10, rowStart: 1, rowSpan: 1 },
      alignment: "left",
    },
    {
      id: "col-1",
      type: "text",
      role: "body",
      gridArea: { colStart: 1, colSpan: 3, rowStart: 2, rowSpan: 5 },
      alignment: "left",
      padding: 4,
    },
    {
      id: "col-2",
      type: "text",
      role: "body",
      gridArea: { colStart: 5, colSpan: 3, rowStart: 2, rowSpan: 5 },
      alignment: "left",
      padding: 4,
    },
    {
      id: "col-3",
      type: "text",
      role: "body",
      gridArea: { colStart: 9, colSpan: 3, rowStart: 2, rowSpan: 5 },
      alignment: "left",
      padding: 4,
    },
  ],
};

/**
 * Full-bleed image background with overlay text zone at the bottom.
 * The image fills the entire slide; text overlays the lower rows.
 */
const fullImage: LayoutDefinition = {
  name: "full-image",
  description: "Full-bleed image with overlay text zone",
  category: "media",
  elements: [
    {
      id: "background-image",
      type: "image",
      role: "hero-image",
      gridArea: { colStart: 0, colSpan: 12, rowStart: 0, rowSpan: 8 },
    },
    {
      id: "heading",
      type: "text",
      role: "heading",
      gridArea: { colStart: 1, colSpan: 8, rowStart: 5, rowSpan: 1 },
      alignment: "left",
    },
    {
      id: "body",
      type: "text",
      role: "body",
      gridArea: { colStart: 1, colSpan: 8, rowStart: 6, rowSpan: 1 },
      alignment: "left",
    },
  ],
};

/**
 * Image grid with 2x2 arrangement and optional captions per image.
 * Four image cells evenly distributed, each with a small caption below.
 */
const imageGrid: LayoutDefinition = {
  name: "image-grid",
  description: "2x2 image grid with optional captions",
  category: "media",
  elements: [
    {
      id: "image-1",
      type: "image",
      role: "hero-image",
      gridArea: { colStart: 1, colSpan: 5, rowStart: 0, rowSpan: 3 },
      padding: 4,
    },
    {
      id: "caption-1",
      type: "text",
      role: "caption",
      gridArea: { colStart: 1, colSpan: 5, rowStart: 3, rowSpan: 1 },
      alignment: "center",
    },
    {
      id: "image-2",
      type: "image",
      role: "hero-image",
      gridArea: { colStart: 7, colSpan: 5, rowStart: 0, rowSpan: 3 },
      padding: 4,
    },
    {
      id: "caption-2",
      type: "text",
      role: "caption",
      gridArea: { colStart: 7, colSpan: 5, rowStart: 3, rowSpan: 1 },
      alignment: "center",
    },
    {
      id: "image-3",
      type: "image",
      role: "hero-image",
      gridArea: { colStart: 1, colSpan: 5, rowStart: 4, rowSpan: 3 },
      padding: 4,
    },
    {
      id: "caption-3",
      type: "text",
      role: "caption",
      gridArea: { colStart: 1, colSpan: 5, rowStart: 7, rowSpan: 1 },
      alignment: "center",
    },
    {
      id: "image-4",
      type: "image",
      role: "hero-image",
      gridArea: { colStart: 7, colSpan: 5, rowStart: 4, rowSpan: 3 },
      padding: 4,
    },
    {
      id: "caption-4",
      type: "text",
      role: "caption",
      gridArea: { colStart: 7, colSpan: 5, rowStart: 7, rowSpan: 1 },
      alignment: "center",
    },
  ],
};

// ============================================================================
// US-008  Quote, Data & Closing Layouts
// ============================================================================

/**
 * Quote layout with large centered italic text and attribution.
 * Includes an oversized opening-quote accent shape for visual impact.
 */
const quoteLayout: LayoutDefinition = {
  name: "quote",
  description: "Large quote text with attribution and accent shape",
  category: "quote",
  elements: [
    {
      id: "quote-accent",
      type: "shape",
      role: "accent-shape",
      gridArea: { colStart: 1, colSpan: 2, rowStart: 1, rowSpan: 2 },
    },
    {
      id: "quote-text",
      type: "text",
      role: "quote",
      gridArea: { colStart: 2, colSpan: 8, rowStart: 2, rowSpan: 3 },
      alignment: "center",
      padding: 8,
    },
    {
      id: "attribution",
      type: "text",
      role: "caption",
      gridArea: { colStart: 3, colSpan: 6, rowStart: 5, rowSpan: 1 },
      alignment: "center",
    },
  ],
};

/**
 * Statistic layout for showcasing 1-3 large numbers with labels.
 * Three stat columns with optional icon placeholder shapes above each.
 */
const statistic: LayoutDefinition = {
  name: "statistic",
  description: "1-3 large numbers with labels and optional icons",
  category: "data",
  elements: [
    {
      id: "icon-1",
      type: "shape",
      role: "accent-shape",
      gridArea: { colStart: 1, colSpan: 3, rowStart: 1, rowSpan: 1 },
    },
    {
      id: "stat-1",
      type: "text",
      role: "display",
      gridArea: { colStart: 1, colSpan: 3, rowStart: 2, rowSpan: 2 },
      alignment: "center",
    },
    {
      id: "label-1",
      type: "text",
      role: "caption",
      gridArea: { colStart: 1, colSpan: 3, rowStart: 4, rowSpan: 1 },
      alignment: "center",
    },
    {
      id: "icon-2",
      type: "shape",
      role: "accent-shape",
      gridArea: { colStart: 5, colSpan: 3, rowStart: 1, rowSpan: 1 },
    },
    {
      id: "stat-2",
      type: "text",
      role: "display",
      gridArea: { colStart: 5, colSpan: 3, rowStart: 2, rowSpan: 2 },
      alignment: "center",
    },
    {
      id: "label-2",
      type: "text",
      role: "caption",
      gridArea: { colStart: 5, colSpan: 3, rowStart: 4, rowSpan: 1 },
      alignment: "center",
    },
    {
      id: "icon-3",
      type: "shape",
      role: "accent-shape",
      gridArea: { colStart: 9, colSpan: 3, rowStart: 1, rowSpan: 1 },
    },
    {
      id: "stat-3",
      type: "text",
      role: "display",
      gridArea: { colStart: 9, colSpan: 3, rowStart: 2, rowSpan: 2 },
      alignment: "center",
    },
    {
      id: "label-3",
      type: "text",
      role: "caption",
      gridArea: { colStart: 9, colSpan: 3, rowStart: 4, rowSpan: 1 },
      alignment: "center",
    },
  ],
};

/**
 * Two-column comparison layout with header labels and a divider.
 * Each side has a heading label and body text, separated by a vertical divider.
 */
const comparisonLayout: LayoutDefinition = {
  name: "comparison",
  description: "Two-column comparison with headers and divider",
  category: "comparison",
  elements: [
    {
      id: "heading",
      type: "text",
      role: "heading",
      gridArea: { colStart: 1, colSpan: 10, rowStart: 0, rowSpan: 1 },
      alignment: "center",
    },
    {
      id: "label-left",
      type: "text",
      role: "subheading",
      gridArea: { colStart: 1, colSpan: 5, rowStart: 1, rowSpan: 1 },
      alignment: "center",
    },
    {
      id: "body-left",
      type: "text",
      role: "body",
      gridArea: { colStart: 1, colSpan: 5, rowStart: 2, rowSpan: 5 },
      alignment: "left",
      padding: 8,
    },
    {
      id: "divider",
      type: "shape",
      role: "divider",
      gridArea: { colStart: 6, colSpan: 1, rowStart: 1, rowSpan: 6 },
    },
    {
      id: "label-right",
      type: "text",
      role: "subheading",
      gridArea: { colStart: 7, colSpan: 5, rowStart: 1, rowSpan: 1 },
      alignment: "center",
    },
    {
      id: "body-right",
      type: "text",
      role: "body",
      gridArea: { colStart: 7, colSpan: 5, rowStart: 2, rowSpan: 5 },
      alignment: "left",
      padding: 8,
    },
  ],
};

/**
 * Closing CTA slide with heading, subtitle, call-to-action, and contact zone.
 * Centered layout for ending a presentation with a clear next step.
 */
const closingCta: LayoutDefinition = {
  name: "closing-cta",
  description: "Centered heading, subtitle, CTA text, and contact info zone",
  category: "closing",
  elements: [
    {
      id: "heading",
      type: "text",
      role: "heading",
      gridArea: { colStart: 2, colSpan: 8, rowStart: 1, rowSpan: 1 },
      alignment: "center",
    },
    {
      id: "subtitle",
      type: "text",
      role: "subheading",
      gridArea: { colStart: 3, colSpan: 6, rowStart: 2, rowSpan: 1 },
      alignment: "center",
    },
    {
      id: "cta",
      type: "text",
      role: "body",
      gridArea: { colStart: 3, colSpan: 6, rowStart: 4, rowSpan: 2 },
      alignment: "center",
      padding: 8,
    },
    {
      id: "contact-info",
      type: "text",
      role: "caption",
      gridArea: { colStart: 3, colSpan: 6, rowStart: 6, rowSpan: 1 },
      alignment: "center",
    },
  ],
};

/**
 * Thank You closing slide with large display text and subtle accents.
 * Simple, impactful closing with minimal visual elements.
 */
const closingThankyou: LayoutDefinition = {
  name: "closing-thankyou",
  description: 'Large "Thank You" display text with subtle accent elements',
  category: "closing",
  elements: [
    {
      id: "accent-top",
      type: "shape",
      role: "accent-shape",
      gridArea: { colStart: 5, colSpan: 2, rowStart: 2, rowSpan: 1 },
    },
    {
      id: "thankyou",
      type: "text",
      role: "display",
      gridArea: { colStart: 2, colSpan: 8, rowStart: 3, rowSpan: 2 },
      alignment: "center",
    },
    {
      id: "accent-bottom",
      type: "shape",
      role: "accent-shape",
      gridArea: { colStart: 5, colSpan: 2, rowStart: 5, rowSpan: 1 },
    },
  ],
};

/**
 * Blank canvas layout with only margins defined.
 * Provides a full-grid body area for free-form slide composition.
 */
const blankCanvas: LayoutDefinition = {
  name: "blank-canvas",
  description: "Empty layout with margins for free-form composition",
  category: "content",
  elements: [
    {
      id: "canvas",
      type: "text",
      role: "body",
      gridArea: { colStart: 1, colSpan: 10, rowStart: 1, rowSpan: 6 },
      alignment: "left",
    },
  ],
};

// ============================================================================
// Exported library
// ============================================================================

/**
 * Complete layout library mapping layout names to their definitions.
 *
 * **US-006 (Title & Section):**
 * `title-center`, `title-left`, `title-bold`, `section-break`, `section-gradient`
 *
 * **US-007 (Content & Media):**
 * `content-left`, `content-right-image`, `content-left-image`, `two-column`,
 * `three-column`, `full-image`, `image-grid`
 *
 * **US-008 (Quote, Data & Closing):**
 * `quote`, `statistic`, `comparison`, `closing-cta`, `closing-thankyou`,
 * `blank-canvas`
 */
export const layoutLibrary: Record<string, LayoutDefinition> = {
  // US-006: Title & Section
  "title-center": titleCenter,
  "title-left": titleLeft,
  "title-bold": titleBold,
  "section-break": sectionBreak,
  "section-gradient": sectionGradient,

  // US-007: Content & Media
  "content-left": contentLeft,
  "content-right-image": contentRightImage,
  "content-left-image": contentLeftImage,
  "two-column": twoColumn,
  "three-column": threeColumn,
  "full-image": fullImage,
  "image-grid": imageGrid,

  // US-008: Quote, Data & Closing
  "quote": quoteLayout,
  "statistic": statistic,
  "comparison": comparisonLayout,
  "closing-cta": closingCta,
  "closing-thankyou": closingThankyou,
  "blank-canvas": blankCanvas,
};
