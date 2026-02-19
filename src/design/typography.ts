/**
 * Typography system for Keynote slide layout engine (US-002).
 *
 * Implements a modular type scale based on the Major Third ratio (1.25)
 * with a default base size of 18 pt. All sizes are in Keynote points.
 */

// ---------------------------------------------------------------------------
// Type role union
// ---------------------------------------------------------------------------

/**
 * Semantic roles for text elements in a presentation.
 *
 * Ordered from largest to smallest default size:
 * display > heading > subheading > body > bodySmall > caption > overline
 * (quote uses body-level sizing with a different typeface)
 */
export type TypeRole =
  | 'display'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'overline'
  | 'quote';

// ---------------------------------------------------------------------------
// Type style interface
// ---------------------------------------------------------------------------

/** Fully resolved typographic style for a single text role. */
export interface TypeStyle {
  fontName: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  lineHeight: number;
  letterSpacing: number;
  color?: string;
  alignment?: 'left' | 'center' | 'right';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default modular-scale ratio (Major Third). */
const DEFAULT_RATIO = 1.25;

/** Default base font size in points. */
const DEFAULT_BASE = 18;

/** Primary sans-serif font. */
const FONT_PRIMARY = 'Helvetica Neue';

/** Serif font used for quotations. */
const FONT_QUOTE = 'Georgia';

// ---------------------------------------------------------------------------
// Scale-step mapping
// ---------------------------------------------------------------------------

/**
 * Number of scale steps each role sits above (positive) or below (negative)
 * the base size. `body` is the anchor at step 0.
 */
const ROLE_STEPS: Record<TypeRole, number> = {
  display: 3,
  heading: 2,
  subheading: 1,
  body: 0,
  quote: 0,
  bodySmall: -1,
  caption: -2,
  overline: -3,
};

// ---------------------------------------------------------------------------
// Per-role defaults (excluding fontSize, which is scale-derived)
// ---------------------------------------------------------------------------

interface RoleDefaults {
  fontName: string;
  fontWeight: 'normal' | 'bold';
  /** Line-height multiplier applied to fontSize. */
  lineHeightMultiplier: number;
  /** Letter-spacing in points. */
  letterSpacing: number;
  color?: string;
  alignment?: 'left' | 'center' | 'right';
}

const ROLE_DEFAULTS: Record<TypeRole, RoleDefaults> = {
  display: {
    fontName: FONT_PRIMARY,
    fontWeight: 'bold',
    lineHeightMultiplier: 1.1,
    letterSpacing: -0.5,
    alignment: 'center',
  },
  heading: {
    fontName: FONT_PRIMARY,
    fontWeight: 'bold',
    lineHeightMultiplier: 1.2,
    letterSpacing: -0.25,
  },
  subheading: {
    fontName: FONT_PRIMARY,
    fontWeight: 'normal',
    lineHeightMultiplier: 1.3,
    letterSpacing: 0,
  },
  body: {
    fontName: FONT_PRIMARY,
    fontWeight: 'normal',
    lineHeightMultiplier: 1.5,
    letterSpacing: 0,
  },
  bodySmall: {
    fontName: FONT_PRIMARY,
    fontWeight: 'normal',
    lineHeightMultiplier: 1.5,
    letterSpacing: 0,
  },
  caption: {
    fontName: FONT_PRIMARY,
    fontWeight: 'normal',
    lineHeightMultiplier: 1.4,
    letterSpacing: 0.1,
  },
  overline: {
    fontName: FONT_PRIMARY,
    fontWeight: 'bold',
    lineHeightMultiplier: 1.4,
    letterSpacing: 1.0,
  },
  quote: {
    fontName: FONT_QUOTE,
    fontWeight: 'normal',
    lineHeightMultiplier: 1.6,
    letterSpacing: 0,
    alignment: 'center',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round a number to at most two decimal places. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Compute the font size for a given role using a modular scale.
 *
 * `fontSize = baseFontSize * ratio ^ step`
 */
function scaledSize(baseFontSize: number, ratio: number, step: number): number {
  return round2(baseFontSize * Math.pow(ratio, step));
}

/** Build a single TypeStyle from role defaults and a computed font size. */
function buildStyle(role: TypeRole, fontSize: number): TypeStyle {
  const d = ROLE_DEFAULTS[role];
  const style: TypeStyle = {
    fontName: d.fontName,
    fontSize,
    fontWeight: d.fontWeight,
    lineHeight: round2(fontSize * d.lineHeightMultiplier),
    letterSpacing: d.letterSpacing,
  };
  if (d.color !== undefined) {
    style.color = d.color;
  }
  if (d.alignment !== undefined) {
    style.alignment = d.alignment;
  }
  return style;
}

// ---------------------------------------------------------------------------
// All roles as an ordered array (useful for iteration)
// ---------------------------------------------------------------------------

const ALL_ROLES: readonly TypeRole[] = [
  'display',
  'heading',
  'subheading',
  'body',
  'bodySmall',
  'caption',
  'overline',
  'quote',
] as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a complete type scale for every {@link TypeRole}.
 *
 * @param baseFontSize - The base font size in points (anchored to `body`).
 * @param ratio - Modular scale ratio. Defaults to 1.25 (Major Third).
 * @returns A record mapping each TypeRole to its computed TypeStyle.
 */
export function createTypeScale(
  baseFontSize: number,
  ratio: number = DEFAULT_RATIO,
): Record<TypeRole, TypeStyle> {
  const scale = {} as Record<TypeRole, TypeStyle>;
  for (const role of ALL_ROLES) {
    const step = ROLE_STEPS[role];
    const fontSize = scaledSize(baseFontSize, ratio, step);
    scale[role] = buildStyle(role, fontSize);
  }
  return scale;
}

/** Lazily-initialised default scale (18 pt base, 1.25 ratio). */
let defaultScale: Record<TypeRole, TypeStyle> | undefined;

function getDefaultScale(): Record<TypeRole, TypeStyle> {
  if (defaultScale === undefined) {
    defaultScale = createTypeScale(DEFAULT_BASE, DEFAULT_RATIO);
  }
  return defaultScale;
}

/**
 * Retrieve the {@link TypeStyle} for a given role, optionally applying
 * property overrides.
 *
 * Uses the default 18 pt / 1.25 scale. For a custom scale, call
 * {@link createTypeScale} directly and index into the result.
 *
 * @param role - The semantic text role.
 * @param overrides - Partial style properties to merge on top of the defaults.
 * @returns The fully resolved TypeStyle.
 */
export function getTypeStyle(
  role: TypeRole,
  overrides?: Partial<TypeStyle>,
): TypeStyle {
  const base = { ...getDefaultScale()[role] };
  if (overrides === undefined) {
    return base;
  }
  return { ...base, ...overrides };
}
