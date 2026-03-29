/**
 * Progress indicator system for multi-slide decks.
 *
 * Generates small visual elements (dots, numbers, progress bars) at the
 * bottom of each slide to show position within the deck.
 */

import type { BrandStyle } from "./brand.js";
import type { ColorPalette } from "./color.js";
import type { AccentElement } from "./accents.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProgressStyle = "dots" | "numbers" | "bar";

// ---------------------------------------------------------------------------
// Progress indicator generation
// ---------------------------------------------------------------------------

/**
 * Choose a progress style based on the brand style.
 */
function progressStyleForBrand(brandStyle: BrandStyle): ProgressStyle {
  switch (brandStyle) {
    case "minimal":
      return "dots";
    case "bold":
      return "numbers";
    case "elegant":
      return "bar";
    case "playful":
      return "dots";
    case "corporate":
      return "dots";
  }
}

/**
 * Generate progress indicator elements for a slide.
 *
 * @param slideIndex - 0-based index within the deck (not the Keynote slide index)
 * @param totalSlides - Total number of slides in the deck
 * @param brandStyle - Brand style to determine indicator type
 * @param palette - Color palette for styling
 * @param canvasWidth - Slide width in points (default 1024)
 * @param canvasHeight - Slide height in points (default 768)
 */
export function generateProgressIndicator(
  slideIndex: number,
  totalSlides: number,
  brandStyle: BrandStyle,
  palette: ColorPalette,
  canvasWidth: number = 1024,
  canvasHeight: number = 768,
): AccentElement[] {
  const style = progressStyleForBrand(brandStyle);
  const elements: AccentElement[] = [];

  const bottomY = canvasHeight - 30;

  if (style === "dots") {
    // Small dots centered at the bottom, filled dot for current slide
    const dotSize = 6;
    const dotGap = 12;
    const totalWidth = totalSlides * dotSize + (totalSlides - 1) * dotGap;
    const startX = (canvasWidth - totalWidth) / 2;

    for (let i = 0; i < totalSlides; i++) {
      const isCurrent = i === slideIndex;
      elements.push({
        type: "circle",
        rect: {
          x: startX + i * (dotSize + dotGap),
          y: bottomY,
          width: dotSize,
          height: dotSize,
        },
        color: isCurrent ? palette.primary : palette.textSecondary,
      });
    }
  } else if (style === "bar") {
    // Thin progress bar at the bottom
    const barHeight = 3;
    const progress = (slideIndex + 1) / totalSlides;

    // Background bar (full width, muted)
    elements.push({
      type: "rectangle",
      rect: {
        x: 0,
        y: canvasHeight - barHeight,
        width: canvasWidth,
        height: barHeight,
      },
      color: palette.surface,
    });

    // Progress fill
    elements.push({
      type: "rectangle",
      rect: {
        x: 0,
        y: canvasHeight - barHeight,
        width: Math.round(canvasWidth * progress),
        height: barHeight,
      },
      color: palette.primary,
    });
  } else {
    // Numbers style: "3/10" as a text-sized shape placeholder
    // We render a small accent rectangle that acts as a background for the number
    // (the actual number text would need to be rendered separately)
    elements.push({
      type: "rectangle",
      rect: {
        x: canvasWidth - 80,
        y: bottomY - 5,
        width: 50,
        height: 20,
      },
      color: palette.surface,
    });
  }

  return elements;
}
