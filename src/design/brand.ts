/**
 * Brand system for Keynote slide design (US-009).
 *
 * Maps brand identity (colors, fonts, style) into the design system by
 * extracting Keynote theme data, merging user overrides, and producing
 * color palettes and typography tokens.
 */

import type { TypeRole, TypeStyle } from "./typography.js";
import type { ColorPalette } from "./color.js";
import { createPalette } from "./color.js";
import { createTypeScale, getTypeStyle } from "./typography.js";
import { runJXA } from "../applescript.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Visual style presets that influence typography weight, size, and spacing. */
export type BrandStyle = "minimal" | "bold" | "elegant" | "playful" | "corporate";

/** User-facing brand configuration. */
export interface BrandConfig {
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  fontPrimary?: string;
  fontSecondary?: string;
  style?: BrandStyle;
}

// ---------------------------------------------------------------------------
// Theme-to-brand mapping (known Keynote themes)
// ---------------------------------------------------------------------------

interface ThemeMapping {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  fontPrimary: string;
  fontSecondary: string;
  style: BrandStyle;
}

/**
 * Known Keynote themes mapped to sensible brand defaults.
 *
 * Theme names are lower-cased for comparison.
 */
const KNOWN_THEMES: Record<string, ThemeMapping> = {
  white: {
    primaryColor: "#333333",
    secondaryColor: "#666666",
    accentColor: "#0070C9",
    backgroundColor: "#FFFFFF",
    fontPrimary: "Helvetica Neue",
    fontSecondary: "Helvetica Neue",
    style: "minimal",
  },
  black: {
    primaryColor: "#FFFFFF",
    secondaryColor: "#CCCCCC",
    accentColor: "#FF9500",
    backgroundColor: "#000000",
    fontPrimary: "Helvetica Neue",
    fontSecondary: "Helvetica Neue",
    style: "bold",
  },
  gradient: {
    primaryColor: "#1A1A2E",
    secondaryColor: "#16213E",
    accentColor: "#E94560",
    backgroundColor: "#0F3460",
    fontPrimary: "Helvetica Neue",
    fontSecondary: "Helvetica Neue",
    style: "bold",
  },
  classic: {
    primaryColor: "#2B579A",
    secondaryColor: "#4472C4",
    accentColor: "#ED7D31",
    backgroundColor: "#FFFFFF",
    fontPrimary: "Helvetica Neue",
    fontSecondary: "Georgia",
    style: "corporate",
  },
  modern: {
    primaryColor: "#2D3436",
    secondaryColor: "#636E72",
    accentColor: "#00B894",
    backgroundColor: "#FAFAFA",
    fontPrimary: "Avenir Next",
    fontSecondary: "Avenir Next",
    style: "minimal",
  },
  "showroom": {
    primaryColor: "#1C1C1E",
    secondaryColor: "#48484A",
    accentColor: "#FF375F",
    backgroundColor: "#F2F2F7",
    fontPrimary: "SF Pro Display",
    fontSecondary: "SF Pro Text",
    style: "elegant",
  },
  "parchment": {
    primaryColor: "#5C4033",
    secondaryColor: "#8B7355",
    accentColor: "#C17817",
    backgroundColor: "#F5E6CA",
    fontPrimary: "Georgia",
    fontSecondary: "Palatino",
    style: "elegant",
  },
  "craft": {
    primaryColor: "#4A4A4A",
    secondaryColor: "#7A7A7A",
    accentColor: "#D4A574",
    backgroundColor: "#F0E8DC",
    fontPrimary: "Avenir",
    fontSecondary: "Georgia",
    style: "elegant",
  },
  "exhibition": {
    primaryColor: "#1A1A1A",
    secondaryColor: "#4A4A4A",
    accentColor: "#E63946",
    backgroundColor: "#F1FAEE",
    fontPrimary: "Futura",
    fontSecondary: "Helvetica Neue",
    style: "bold",
  },
  "blueprint": {
    primaryColor: "#003F88",
    secondaryColor: "#005BBB",
    accentColor: "#FFD60A",
    backgroundColor: "#E8F0FE",
    fontPrimary: "Menlo",
    fontSecondary: "Helvetica Neue",
    style: "corporate",
  },
  "photo essay": {
    primaryColor: "#2C3E50",
    secondaryColor: "#7F8C8D",
    accentColor: "#E74C3C",
    backgroundColor: "#ECF0F1",
    fontPrimary: "Avenir Next",
    fontSecondary: "Avenir Next",
    style: "minimal",
  },
};

// ---------------------------------------------------------------------------
// Default brand config (fallback)
// ---------------------------------------------------------------------------

const DEFAULT_BRAND: BrandConfig = {
  primaryColor: "#2B579A",
  secondaryColor: "#4472C4",
  accentColor: "#ED7D31",
  backgroundColor: "#FFFFFF",
  fontPrimary: "Helvetica Neue",
  fontSecondary: "Helvetica Neue",
  style: "corporate",
};

// ---------------------------------------------------------------------------
// Theme extraction from Keynote via JXA
// ---------------------------------------------------------------------------

/**
 * Extract brand configuration from the active Keynote document's theme.
 *
 * Uses JXA to read the theme name, then maps known themes to brand colors
 * and fonts. If extraction fails (no document open, Keynote not running, etc.)
 * returns sensible defaults.
 *
 * @param _slideIndex - Reserved for future per-slide extraction. Currently unused.
 * @returns A complete BrandConfig derived from the active theme.
 */
export async function extractThemeColors(_slideIndex?: number): Promise<BrandConfig> {
  try {
    const script = `
      (function() {
        var app = Application("Keynote");
        var doc = app.documents[0];
        var theme = doc.documentTheme();
        var themeName = theme.name();
        return themeName;
      })()
    `;

    const themeName = await runJXA(script);
    const normalised = themeName.trim().toLowerCase();

    // Look up known theme
    const mapping = KNOWN_THEMES[normalised];
    if (mapping) {
      return {
        primaryColor: mapping.primaryColor,
        secondaryColor: mapping.secondaryColor,
        accentColor: mapping.accentColor,
        backgroundColor: mapping.backgroundColor,
        fontPrimary: mapping.fontPrimary,
        fontSecondary: mapping.fontSecondary,
        style: mapping.style,
      };
    }

    // Unknown theme -- return defaults with corporate style
    return { ...DEFAULT_BRAND };
  } catch (error) {
    console.error(
      "Theme extraction failed:",
      error instanceof Error ? error.message : String(error)
    );
    return { ...DEFAULT_BRAND };
  }
}

// ---------------------------------------------------------------------------
// Brand resolution (merge user config over theme defaults)
// ---------------------------------------------------------------------------

/**
 * Resolve a final BrandConfig by merging optional user overrides on top of
 * theme-extracted defaults.
 *
 * If no user config is provided the theme defaults are returned as-is.
 * Only explicitly provided user fields override the theme.
 */
export async function resolveBrand(userConfig?: Partial<BrandConfig>): Promise<BrandConfig> {
  const themeDefaults = await extractThemeColors();

  if (!userConfig) {
    return themeDefaults;
  }

  return {
    primaryColor: userConfig.primaryColor ?? themeDefaults.primaryColor,
    secondaryColor: userConfig.secondaryColor ?? themeDefaults.secondaryColor,
    accentColor: userConfig.accentColor ?? themeDefaults.accentColor,
    backgroundColor: userConfig.backgroundColor ?? themeDefaults.backgroundColor,
    fontPrimary: userConfig.fontPrimary ?? themeDefaults.fontPrimary,
    fontSecondary: userConfig.fontSecondary ?? themeDefaults.fontSecondary,
    style: userConfig.style ?? themeDefaults.style,
  };
}

// ---------------------------------------------------------------------------
// Style modifiers (influence typography based on BrandStyle)
// ---------------------------------------------------------------------------

interface StyleModifiers {
  /** Multiplier applied to all font sizes. */
  sizeScale: number;
  /** Base font size in points for the type scale. */
  baseFontSize: number;
  /** Type scale ratio. */
  scaleRatio: number;
  /** Default font weight for body text. */
  bodyWeight: "normal" | "bold";
  /** Default font weight for headings. */
  headingWeight: "normal" | "bold";
  /** Prefer serif for heading roles. */
  preferSerif: boolean;
}

function getStyleModifiers(style: BrandStyle): StyleModifiers {
  switch (style) {
    case "minimal":
      return {
        sizeScale: 0.95,
        baseFontSize: 18,
        scaleRatio: 1.2,
        bodyWeight: "normal",
        headingWeight: "normal",
        preferSerif: false,
      };
    case "bold":
      return {
        sizeScale: 1.1,
        baseFontSize: 20,
        scaleRatio: 1.3,
        bodyWeight: "normal",
        headingWeight: "bold",
        preferSerif: false,
      };
    case "elegant":
      return {
        sizeScale: 1.0,
        baseFontSize: 18,
        scaleRatio: 1.25,
        bodyWeight: "normal",
        headingWeight: "normal",
        preferSerif: true,
      };
    case "playful":
      return {
        sizeScale: 1.05,
        baseFontSize: 19,
        scaleRatio: 1.28,
        bodyWeight: "normal",
        headingWeight: "bold",
        preferSerif: false,
      };
    case "corporate":
      return {
        sizeScale: 1.0,
        baseFontSize: 18,
        scaleRatio: 1.25,
        bodyWeight: "normal",
        headingWeight: "bold",
        preferSerif: false,
      };
  }
}

// ---------------------------------------------------------------------------
// Heading vs body role classification
// ---------------------------------------------------------------------------

const HEADING_ROLES: ReadonlySet<TypeRole> = new Set<TypeRole>([
  "display",
  "heading",
  "subheading",
  "overline",
]);

const BODY_ROLES: ReadonlySet<TypeRole> = new Set<TypeRole>([
  "body",
  "bodySmall",
  "caption",
  "quote",
]);

// All roles for iteration
const ALL_ROLES: readonly TypeRole[] = [
  "display",
  "heading",
  "subheading",
  "body",
  "bodySmall",
  "caption",
  "overline",
  "quote",
] as const;

// ---------------------------------------------------------------------------
// Serif font fallback map
// ---------------------------------------------------------------------------

/** When elegant style requests serif, map common sans to serif equivalents. */
const SERIF_FALLBACKS: Record<string, string> = {
  "Helvetica Neue": "Georgia",
  "Helvetica": "Georgia",
  "Avenir": "Palatino",
  "Avenir Next": "Palatino",
  "SF Pro Display": "New York",
  "SF Pro Text": "New York",
  "Futura": "Didot",
  "Arial": "Times New Roman",
};

function toSerif(fontName: string): string {
  return SERIF_FALLBACKS[fontName] ?? fontName;
}

// ---------------------------------------------------------------------------
// Brand-to-tokens mapping
// ---------------------------------------------------------------------------

/**
 * Convert a BrandConfig into concrete design system tokens: a ColorPalette
 * and a full set of TypeStyle records keyed by TypeRole.
 *
 * The `style` property on the brand config adjusts token generation:
 * - **minimal** -- smaller scale ratio, lighter heading weights, more whitespace
 * - **bold** -- larger base size, heavier weights, wider scale ratio
 * - **elegant** -- serif fonts for headings, refined spacing
 * - **playful** -- slightly larger/rounded feel, bold headings
 * - **corporate** -- clean sans-serif, standard sizing, bold headings
 */
export function brandToTokens(brand: BrandConfig): {
  palette: ColorPalette;
  typography: Record<TypeRole, TypeStyle>;
} {
  const style = brand.style ?? "corporate";
  const modifiers = getStyleModifiers(style);

  // -- Palette --
  const palette = createPalette(brand.primaryColor);

  // Override palette slots if the brand specifies explicit colors
  if (brand.secondaryColor) {
    palette.secondary = brand.secondaryColor;
  }
  if (brand.accentColor) {
    palette.accent = brand.accentColor;
  }
  if (brand.backgroundColor) {
    palette.background = brand.backgroundColor;
  }

  // -- Typography --
  // Start from a base type scale adjusted by style modifiers
  const baseScale = createTypeScale(modifiers.baseFontSize, modifiers.scaleRatio);

  // Determine font assignments
  const headingFont = modifiers.preferSerif
    ? toSerif(brand.fontPrimary ?? "Helvetica Neue")
    : (brand.fontPrimary ?? "Helvetica Neue");

  const bodyFont = brand.fontSecondary ?? brand.fontPrimary ?? "Helvetica Neue";

  // Quote font: use secondary (body) font in serif if elegant, otherwise as-is
  const quoteFont = modifiers.preferSerif
    ? toSerif(bodyFont)
    : (brand.fontSecondary ?? "Georgia");

  // Build final typography map
  const typography = {} as Record<TypeRole, TypeStyle>;

  for (const role of ALL_ROLES) {
    const base = baseScale[role];

    // Determine font for this role
    let fontName: string;
    if (role === "quote") {
      fontName = quoteFont;
    } else if (HEADING_ROLES.has(role)) {
      fontName = headingFont;
    } else {
      fontName = bodyFont;
    }

    // Determine weight
    let fontWeight: "normal" | "bold";
    if (HEADING_ROLES.has(role)) {
      fontWeight = modifiers.headingWeight;
    } else if (BODY_ROLES.has(role)) {
      fontWeight = modifiers.bodyWeight;
    } else {
      fontWeight = base.fontWeight;
    }

    // Apply size scale modifier
    const fontSize = Math.round(base.fontSize * modifiers.sizeScale * 100) / 100;
    const lineHeight = Math.round(base.lineHeight * modifiers.sizeScale * 100) / 100;

    typography[role] = {
      fontName,
      fontSize,
      fontWeight,
      lineHeight,
      letterSpacing: base.letterSpacing,
      ...(base.color !== undefined ? { color: base.color } : {}),
      ...(base.alignment !== undefined ? { alignment: base.alignment } : {}),
    };
  }

  return { palette, typography };
}
