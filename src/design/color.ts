/**
 * Color engine for Keynote slide design (US-003).
 *
 * Provides hex/HSL conversion, palette generation with color harmonies,
 * WCAG contrast-ratio checking, and automatic palette creation for slides.
 *
 * All color values are hex strings in "#RRGGBB" format.
 * Pure TypeScript -- no external dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Harmony =
  | "complementary"
  | "analogous"
  | "triadic"
  | "split-complementary"
  | "monochromatic";

export interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  textOnPrimary: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Clamp a number to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Parse a "#RRGGBB" hex string into [r, g, b] each 0-255. */
function hexToRGB(hex: string): [number, number, number] {
  const cleaned = hex.replace(/^#/, "");
  if (cleaned.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    throw new Error(`Invalid hex color: "${hex}". Expected format "#RRGGBB".`);
  }
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return [r, g, b];
}

/** Convert [r, g, b] (0-255) to a "#RRGGBB" string. */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number): string =>
    clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Normalize a hue value to [0, 360). */
function normalizeHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

// ---------------------------------------------------------------------------
// Hex <-> HSL conversion
// ---------------------------------------------------------------------------

/**
 * Convert a hex color ("#RRGGBB") to HSL.
 *
 * Returns `{ h, s, l }` where h is 0-360, s is 0-100, l is 0-100.
 */
export function hexToHSL(hex: string): HSL {
  const [r, g, b] = hexToRGB(hex);

  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  // Lightness
  const l = (max + min) / 2;

  // Achromatic
  if (delta === 0) {
    return { h: 0, s: 0, l: Math.round(l * 100) };
  }

  // Saturation
  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  // Hue
  let h: number;
  if (max === rNorm) {
    h = ((gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0)) * 60;
  } else if (max === gNorm) {
    h = ((bNorm - rNorm) / delta + 2) * 60;
  } else {
    h = ((rNorm - gNorm) / delta + 4) * 60;
  }

  return {
    h: Math.round(normalizeHue(h)),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert HSL values to a "#RRGGBB" hex string.
 *
 * @param h - Hue 0-360
 * @param s - Saturation 0-100
 * @param l - Lightness 0-100
 */
export function hslToHex(h: number, s: number, l: number): string {
  const hNorm = normalizeHue(h);
  const sNorm = clamp(s, 0, 100) / 100;
  const lNorm = clamp(l, 0, 100) / 100;

  if (sNorm === 0) {
    const gray = Math.round(lNorm * 255);
    return rgbToHex(gray, gray, gray);
  }

  const hueToRgb = (p: number, q: number, t: number): number => {
    let tNorm = t;
    if (tNorm < 0) tNorm += 1;
    if (tNorm > 1) tNorm -= 1;
    if (tNorm < 1 / 6) return p + (q - p) * 6 * tNorm;
    if (tNorm < 1 / 2) return q;
    if (tNorm < 2 / 3) return p + (q - p) * (2 / 3 - tNorm) * 6;
    return p;
  };

  const q = lNorm < 0.5
    ? lNorm * (1 + sNorm)
    : lNorm + sNorm - lNorm * sNorm;
  const p = 2 * lNorm - q;
  const hFrac = hNorm / 360;

  const r = hueToRgb(p, q, hFrac + 1 / 3);
  const g = hueToRgb(p, q, hFrac);
  const b = hueToRgb(p, q, hFrac - 1 / 3);

  return rgbToHex(r * 255, g * 255, b * 255);
}

// ---------------------------------------------------------------------------
// Palette generation (color harmonies)
// ---------------------------------------------------------------------------

/**
 * Generate a 5-color palette from a base color using a color harmony rule.
 *
 * @param baseColor - Hex color string "#RRGGBB"
 * @param harmony - One of: complementary, analogous, triadic,
 *                  split-complementary, monochromatic
 * @returns Array of 5 hex color strings
 */
export function generatePalette(baseColor: string, harmony: Harmony): string[] {
  const { h, s, l } = hexToHSL(baseColor);

  switch (harmony) {
    case "complementary":
      // Base, complement, two lighter/darker variants, muted middle
      return [
        hslToHex(h, s, l),
        hslToHex(normalizeHue(h + 180), s, l),
        hslToHex(h, s, clamp(l + 15, 0, 100)),
        hslToHex(normalizeHue(h + 180), s, clamp(l + 15, 0, 100)),
        hslToHex(normalizeHue(h + 90), clamp(s - 30, 0, 100), l),
      ];

    case "analogous":
      // Five colors spaced 30 degrees apart centered on base
      return [
        hslToHex(normalizeHue(h - 60), s, l),
        hslToHex(normalizeHue(h - 30), s, l),
        hslToHex(h, s, l),
        hslToHex(normalizeHue(h + 30), s, l),
        hslToHex(normalizeHue(h + 60), s, l),
      ];

    case "triadic":
      // Three main at 120-degree intervals, plus two tints
      return [
        hslToHex(h, s, l),
        hslToHex(normalizeHue(h + 120), s, l),
        hslToHex(normalizeHue(h + 240), s, l),
        hslToHex(h, clamp(s - 20, 0, 100), clamp(l + 20, 0, 100)),
        hslToHex(normalizeHue(h + 120), clamp(s - 20, 0, 100), clamp(l + 20, 0, 100)),
      ];

    case "split-complementary":
      // Base, two flanking the complement at +/-30, plus two variants
      return [
        hslToHex(h, s, l),
        hslToHex(normalizeHue(h + 150), s, l),
        hslToHex(normalizeHue(h + 210), s, l),
        hslToHex(h, s, clamp(l + 20, 0, 100)),
        hslToHex(normalizeHue(h + 150), s, clamp(l - 15, 0, 100)),
      ];

    case "monochromatic":
      // Five shades/tints of the same hue
      return [
        hslToHex(h, s, clamp(l - 30, 0, 100)),
        hslToHex(h, s, clamp(l - 15, 0, 100)),
        hslToHex(h, s, l),
        hslToHex(h, s, clamp(l + 15, 0, 100)),
        hslToHex(h, s, clamp(l + 30, 0, 100)),
      ];
  }
}

// ---------------------------------------------------------------------------
// WCAG contrast ratio
// ---------------------------------------------------------------------------

/**
 * Linearize a single sRGB channel value (0-255) to linear RGB.
 *
 * Per WCAG 2.x specification:
 * - Normalize to 0-1 range
 * - If <= 0.04045: divide by 12.92
 * - Else: ((val + 0.055) / 1.055) ^ 2.4
 */
function linearize(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.04045
    ? srgb / 12.92
    : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

/**
 * Calculate relative luminance of a hex color per WCAG 2.x.
 *
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 */
function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRGB(hex);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * Calculate the WCAG contrast ratio between two colors.
 *
 * Returns a value between 1 and 21.
 * Ratio = (L1 + 0.05) / (L2 + 0.05) where L1 >= L2.
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = relativeLuminance(color1);
  const lum2 = relativeLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// Contrast enforcement
// ---------------------------------------------------------------------------

/**
 * Adjust the foreground color to ensure it meets the minimum contrast ratio
 * against the given background.
 *
 * If the current contrast ratio is already >= minRatio, returns the
 * foreground unchanged. Otherwise, progressively lightens or darkens
 * the foreground until the ratio is met.
 *
 * @param foreground - Hex color of the foreground (text)
 * @param background - Hex color of the background
 * @param minRatio - Minimum contrast ratio (default 4.5 for WCAG AA)
 * @returns Adjusted foreground hex color
 */
export function ensureContrast(
  foreground: string,
  background: string,
  minRatio: number = 4.5,
): string {
  if (getContrastRatio(foreground, background) >= minRatio) {
    return foreground;
  }

  const { h, s } = hexToHSL(foreground);
  const bgLum = relativeLuminance(background);

  // Decide direction: if background is dark, lighten foreground; else darken.
  const shouldLighten = bgLum < 0.5;

  // Binary search for the target lightness
  let low: number;
  let high: number;

  if (shouldLighten) {
    low = hexToHSL(foreground).l;
    high = 100;
  } else {
    low = 0;
    high = hexToHSL(foreground).l;
  }

  let bestHex = foreground;

  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    const candidate = hslToHex(h, s, mid);
    const ratio = getContrastRatio(candidate, background);

    if (ratio >= minRatio) {
      bestHex = candidate;
      // Try to stay closer to the original color
      if (shouldLighten) {
        high = mid;
      } else {
        low = mid;
      }
    } else {
      if (shouldLighten) {
        low = mid;
      } else {
        high = mid;
      }
    }
  }

  // Final check: if we still can't meet the ratio, fall back to black or white
  if (getContrastRatio(bestHex, background) < minRatio) {
    const whiteRatio = getContrastRatio("#ffffff", background);
    const blackRatio = getContrastRatio("#000000", background);
    return whiteRatio >= blackRatio ? "#ffffff" : "#000000";
  }

  return bestHex;
}

// ---------------------------------------------------------------------------
// Automatic accent color
// ---------------------------------------------------------------------------

/**
 * Pick a high-contrast accent color for the given base color.
 *
 * Strategy: rotate the hue to the complement, boost saturation,
 * then ensure the accent has strong contrast against the base.
 */
export function autoAccent(baseColor: string): string {
  const { h, s, l } = hexToHSL(baseColor);

  // Start with the complementary hue, high saturation, contrasting lightness
  const accentHue = normalizeHue(h + 180);
  const accentSat = clamp(s + 20, 40, 100);

  // If base is light, make accent darker; if dark, make accent lighter
  const accentLight = l > 50 ? clamp(l - 35, 20, 45) : clamp(l + 35, 55, 80);

  let accent = hslToHex(accentHue, accentSat, accentLight);

  // Ensure minimum contrast of 3:1 against the base (suitable for UI accents)
  accent = ensureContrast(accent, baseColor, 3.0);

  return accent;
}

// ---------------------------------------------------------------------------
// Full palette creation
// ---------------------------------------------------------------------------

/**
 * Create a complete color palette from a single primary color.
 *
 * @param primary - Hex color string "#RRGGBB"
 * @param options - Optional settings. `dark: true` generates a dark-mode palette.
 * @returns A `ColorPalette` with all role-based colors
 */
export function createPalette(
  primary: string,
  options?: { dark?: boolean },
): ColorPalette {
  const dark = options?.dark ?? false;
  const { h, s, l } = hexToHSL(primary);

  if (dark) {
    // -- Dark mode palette --
    const background = hslToHex(h, clamp(s - 40, 5, 20), 10);
    const surface = hslToHex(h, clamp(s - 35, 5, 20), 16);
    const secondary = hslToHex(normalizeHue(h + 30), clamp(s - 10, 20, 80), clamp(l + 10, 50, 75));
    const accent = autoAccent(primary);

    const textPrimary = ensureContrast("#e0e0e0", background, 7);
    const textSecondary = ensureContrast("#9e9e9e", background, 4.5);
    const textOnPrimary = ensureContrast("#ffffff", primary, 4.5);

    return {
      primary,
      secondary,
      accent,
      background,
      surface,
      textPrimary,
      textSecondary,
      textOnPrimary,
    };
  }

  // -- Light mode palette --
  const background = hslToHex(h, clamp(s - 40, 0, 15), 97);
  const surface = hslToHex(h, clamp(s - 35, 0, 15), 100);
  const secondary = hslToHex(normalizeHue(h + 30), clamp(s - 10, 20, 80), clamp(l - 5, 30, 55));
  const accent = autoAccent(primary);

  const textPrimary = ensureContrast("#212121", background, 7);
  const textSecondary = ensureContrast("#616161", background, 4.5);
  const textOnPrimary = ensureContrast("#ffffff", primary, 4.5);

  return {
    primary,
    secondary,
    accent,
    background,
    surface,
    textPrimary,
    textSecondary,
    textOnPrimary,
  };
}
