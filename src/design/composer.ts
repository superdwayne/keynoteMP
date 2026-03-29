/**
 * Slide Composer — orchestration engine for Keynote slide construction (US-010).
 *
 * Takes a layout definition, brand config, and content, then executes
 * existing AppleScript/JXA functions to build a complete slide.
 *
 * The composer handles:
 * 1. Brand resolution and token generation
 * 2. Layout selection and variation
 * 3. Grid creation and element resolution
 * 4. Visual balancing
 * 5. Accent generation
 * 6. Rendering via AppleScript/JXA
 */

import type { TypeRole, TypeStyle } from "./typography.js";
import type { ColorPalette } from "./color.js";
import type { DesignTokens } from "./tokens.js";
import type { LayoutDefinition, ResolvedElement, ElementRole } from "./layouts.js";
import type { BrandConfig, BrandStyle } from "./brand.js";
import type { ResolvedElement as BalanceResolvedElement } from "./balance.js";
import type { AccentElement } from "./accents.js";
import type { SlideContent } from "./variations.js";

import { defaultTokens } from "./tokens.js";
import { ensureContrast } from "./color.js";
import { Grid } from "./grid.js";
import { resolveLayout } from "./layouts.js";
import { layoutLibrary } from "./layout-library.js";
import { resolveBrand, brandToTokens } from "./brand.js";
import { balanceComposition } from "./balance.js";
import { generateAccents } from "./accents.js";
import { generateVariation, selectLayout } from "./variations.js";
import { generateProgressIndicator } from "./progress.js";
import {
  runAppleScript,
  keynoteScript,
  escapeAppleScriptString,
  hexToKeynoteRGB,
} from "../applescript.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Input configuration for composing a single slide. */
export interface SlideComposerInput {
  /** 1-based slide index to compose onto. */
  slideIndex: number;
  /** Optional layout name from the library. If not provided, selectLayout is used. */
  layoutName?: string;
  /** Content payload for the slide. */
  content: SlideContent;
  /** Optional brand overrides merged on top of the active theme. */
  brand?: Partial<BrandConfig>;
  /** Optional seed for deterministic layout variation. */
  variationSeed?: number;
  /** Whether to add decorative accents (default true). */
  addAccents?: boolean;
}

/** Result of composing a single slide. */
export interface SlideComposerResult {
  slideIndex: number;
  layoutName: string;
  elementsPlaced: number;
  accentsPlaced: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// TypeRole helpers
// ---------------------------------------------------------------------------

/** All TypeRole values that can be used for text element role mapping. */
const TEXT_TYPE_ROLES: ReadonlySet<string> = new Set<string>([
  "display",
  "heading",
  "subheading",
  "body",
  "bodySmall",
  "caption",
  "overline",
  "quote",
]);

/**
 * Convert an ElementRole to a TypeRole for typography lookup.
 * Non-text roles (hero-image, accent-shape, divider, background-shape)
 * default to "body".
 */
function elementRoleToTypeRole(role: ElementRole): TypeRole {
  if (TEXT_TYPE_ROLES.has(role)) {
    return role as TypeRole;
  }
  return "body";
}

// ---------------------------------------------------------------------------
// Content-to-element mapping
// ---------------------------------------------------------------------------

/**
 * Build a map from element IDs to text content, based on the layout
 * elements and the slide content payload.
 *
 * Mapping rules:
 * - content.title  -> elements with role "display" or "heading" (prefer "display")
 * - content.subtitle -> elements with role "subheading"
 * - content.body -> elements with role "body"
 * - content.bodyItems -> joined with newlines, mapped to "body" role elements
 * - content.quote -> elements with role "quote"
 * - content.attribution -> elements with role "caption" appearing after a quote element
 * - content.stats -> elements with role "display" (for values) and "caption" (for labels)
 */
function mapContentToElements(
  elements: ResolvedElement[],
  content: SlideContent,
): Map<string, string> {
  const textMap = new Map<string, string>();

  // Classify elements by role
  const displayElements: ResolvedElement[] = [];
  const headingElements: ResolvedElement[] = [];
  const subheadingElements: ResolvedElement[] = [];
  const bodyElements: ResolvedElement[] = [];
  const quoteElements: ResolvedElement[] = [];
  const captionElements: ResolvedElement[] = [];

  for (const el of elements) {
    if (el.type !== "text") continue;
    switch (el.role) {
      case "display":
        displayElements.push(el);
        break;
      case "heading":
        headingElements.push(el);
        break;
      case "subheading":
        subheadingElements.push(el);
        break;
      case "body":
        bodyElements.push(el);
        break;
      case "quote":
        quoteElements.push(el);
        break;
      case "caption":
        captionElements.push(el);
        break;
      // overline, bodySmall are handled below if needed
    }
  }

  // Track which elements have been assigned
  const assignedDisplays = new Set<string>();
  const assignedCaptions = new Set<string>();

  // --- Stats mapping (takes priority for display + caption elements) ---
  if (content.stats && content.stats.length > 0) {
    // Stats use display elements for values and caption elements for labels.
    // Match by index order.
    const availableDisplays = [...displayElements];
    const availableCaptions = [...captionElements];

    for (let i = 0; i < content.stats.length; i++) {
      const stat = content.stats[i];
      if (i < availableDisplays.length) {
        textMap.set(availableDisplays[i].id, stat.value);
        assignedDisplays.add(availableDisplays[i].id);
      }
      if (i < availableCaptions.length) {
        textMap.set(availableCaptions[i].id, stat.label);
        assignedCaptions.add(availableCaptions[i].id);
      }
    }
  }

  // --- Title mapping ---
  if (content.title) {
    // Prefer display elements not already used by stats
    const unusedDisplay = displayElements.find((el) => !assignedDisplays.has(el.id));
    if (unusedDisplay) {
      textMap.set(unusedDisplay.id, content.title);
      assignedDisplays.add(unusedDisplay.id);
    } else if (headingElements.length > 0) {
      textMap.set(headingElements[0].id, content.title);
    }
  }

  // --- Subtitle mapping ---
  if (content.subtitle) {
    if (subheadingElements.length > 0) {
      textMap.set(subheadingElements[0].id, content.subtitle);
    }
  }

  // --- Quote mapping ---
  if (content.quote) {
    if (quoteElements.length > 0) {
      textMap.set(quoteElements[0].id, content.quote);
    }
  }

  // --- Attribution mapping (caption after quote) ---
  if (content.attribution) {
    // Find a caption element not already assigned
    const unusedCaption = captionElements.find((el) => !assignedCaptions.has(el.id));
    if (unusedCaption) {
      textMap.set(unusedCaption.id, content.attribution);
      assignedCaptions.add(unusedCaption.id);
    }
  }

  // --- Body mapping ---
  const bodyText = content.body
    ?? (content.bodyItems ? content.bodyItems.join("\n") : undefined);
  if (bodyText) {
    if (bodyElements.length > 0) {
      textMap.set(bodyElements[0].id, bodyText);
    }
  }

  return textMap;
}

/**
 * Build a map from image element IDs to file paths.
 */
function mapImagesToElements(
  elements: ResolvedElement[],
  content: SlideContent,
): Map<string, string> {
  const imageMap = new Map<string, string>();
  if (!content.imagePaths || content.imagePaths.length === 0) {
    return imageMap;
  }

  const imageElements = elements.filter((el) => el.type === "image");
  for (let i = 0; i < imageElements.length && i < content.imagePaths.length; i++) {
    imageMap.set(imageElements[i].id, content.imagePaths[i]);
  }

  return imageMap;
}

// ---------------------------------------------------------------------------
// Color helpers for shape rendering
// ---------------------------------------------------------------------------

/**
 * Determine the fill color for a shape element based on its role.
 */
function getShapeFillColor(
  role: ElementRole,
  palette: ColorPalette,
): string {
  switch (role) {
    case "background-shape":
      return palette.background;
    case "accent-shape":
      return palette.accent;
    case "divider":
      return palette.textSecondary;
    default:
      return palette.surface;
  }
}

// ---------------------------------------------------------------------------
// Rendering helpers (private)
// ---------------------------------------------------------------------------

/**
 * Render a text element onto a Keynote slide using JXA.
 *
 * Creates a text item at the specified position/size with font, size,
 * weight, and color formatting applied.
 */
async function renderTextElement(
  slideIndex: number,
  el: ResolvedElement,
  text: string,
  style: TypeStyle,
  textColor: string,
): Promise<void> {
  const rgb = hexToKeynoteRGB(textColor);
  const escapedText = escapeAppleScriptString(text);
  const escapedFont = escapeAppleScriptString(style.fontName);
  const isBold = style.fontWeight === "bold";

  const x = Math.round(el.rect.x);
  const y = Math.round(el.rect.y);
  const w = Math.round(el.rect.width);
  const h = Math.round(el.rect.height);

  // Create the text item and apply formatting via AppleScript.
  // JXA push is unreliable for text items — position/size assignments are
  // silently ignored. AppleScript `make` correctly sets all properties.
  const commands: string[] = [];
  commands.push(`tell slide ${slideIndex} of document 1`);
  commands.push(`  set newItem to make new text item with properties {object text:"${escapedText}", position:{${x}, ${y}}, width:${w}, height:${h}}`);
  commands.push(`  set font of object text of newItem to "${escapedFont}"`);
  commands.push(`  set size of object text of newItem to ${style.fontSize}`);
  commands.push(`  set color of object text of newItem to {${rgb.r}, ${rgb.g}, ${rgb.b}}`);
  commands.push(`end tell`);

  // Bold must be set outside `tell slide` block — AppleScript restricts
  // access to `bold` within a slide tell context.
  if (isBold) {
    commands.push(`set bold of object text of last text item of slide ${slideIndex} of document 1 to true`);
  }

  const script = keynoteScript(commands.join("\n"));
  await runAppleScript(script);
}

/**
 * Render a shape element onto a Keynote slide using AppleScript.
 */
async function renderShapeElement(
  slideIndex: number,
  el: ResolvedElement,
  fillColor: string,
): Promise<void> {
  const rgb = hexToKeynoteRGB(fillColor);
  const x = Math.round(el.rect.x);
  const y = Math.round(el.rect.y);
  const w = Math.round(el.rect.width);
  const h = Math.round(el.rect.height);

  const script = keynoteScript(
    `tell slide ${slideIndex} of document 1\n` +
    `  set newShape to make new shape with properties {position:{${x}, ${y}}, width:${w}, height:${h}}\n` +
    `  try\n` +
    `    set color of newShape to {${rgb.r}, ${rgb.g}, ${rgb.b}}\n` +
    `  end try\n` +
    `end tell`
  );

  await runAppleScript(script);
}

/**
 * Render an image element onto a Keynote slide using AppleScript.
 */
async function renderImageElement(
  slideIndex: number,
  el: ResolvedElement,
  filePath: string,
): Promise<void> {
  const escapedPath = escapeAppleScriptString(filePath);
  const x = Math.round(el.rect.x);
  const y = Math.round(el.rect.y);
  const w = Math.round(el.rect.width);
  const h = Math.round(el.rect.height);

  const script = keynoteScript(
    `tell slide ${slideIndex} of document 1\n` +
    `  make new image with properties {file: (POSIX file "${escapedPath}" as alias), position: {${x}, ${y}}, width: ${w}, height: ${h}}\n` +
    `end tell`
  );

  await runAppleScript(script);
}

/**
 * Render a decorative accent element onto a Keynote slide.
 *
 * Accents are rendered as shapes (rectangle/line/circle all become
 * Keynote shapes with the appropriate dimensions).
 */
async function renderAccentElement(
  slideIndex: number,
  accent: AccentElement,
): Promise<void> {
  const rgb = hexToKeynoteRGB(accent.color);
  const x = Math.round(accent.rect.x);
  const y = Math.round(accent.rect.y);
  const w = Math.round(accent.rect.width);
  const h = Math.round(accent.rect.height);

  // All accent types (line, rectangle, circle) are rendered as Keynote shapes.
  // Keynote's default shape is a rectangle, which works for all three types
  // at these dimensions (lines are very thin rectangles, circles are equal w/h).
  const script = keynoteScript(
    `tell slide ${slideIndex} of document 1\n` +
    `  set newShape to make new shape with properties {position:{${x}, ${y}}, width:${w}, height:${h}}\n` +
    `  try\n` +
    `    set color of newShape to {${rgb.r}, ${rgb.g}, ${rgb.b}}\n` +
    `  end try\n` +
    `end tell`
  );

  await runAppleScript(script);
}

// ---------------------------------------------------------------------------
// Resolved element conversion for balance.ts
// ---------------------------------------------------------------------------

/**
 * Convert a layouts.ts ResolvedElement to a balance.ts ResolvedElement.
 * The balance module has a simpler interface with `role: string`.
 */
function toBalanceElement(el: ResolvedElement): BalanceResolvedElement {
  return {
    id: el.id,
    type: el.type,
    role: el.role,
    rect: { ...el.rect },
    padding: el.padding,
  };
}

/**
 * Apply balanced positions back to the original resolved elements.
 */
function applyBalancedPositions(
  originals: ResolvedElement[],
  balanced: BalanceResolvedElement[],
): ResolvedElement[] {
  return originals.map((el, i) => ({
    ...el,
    rect: { ...balanced[i].rect },
  }));
}

// ---------------------------------------------------------------------------
// Main composition function
// ---------------------------------------------------------------------------

/**
 * Compose a complete slide by resolving brand, layout, grid, balance,
 * and rendering all elements via AppleScript/JXA.
 *
 * @param input - The composition input specifying slide index, content,
 *                layout, brand, and options.
 * @returns A result object with counts and any errors encountered.
 */
export async function composeSlide(
  input: SlideComposerInput,
): Promise<SlideComposerResult> {
  const errors: string[] = [];
  let elementsPlaced = 0;
  let accentsPlaced = 0;

  // 1. Resolve brand and generate tokens
  const brand = await resolveBrand(input.brand);
  const { palette, typography } = brandToTokens(brand);

  // 2. Select layout
  let layout: LayoutDefinition;
  if (input.layoutName && layoutLibrary[input.layoutName]) {
    layout = layoutLibrary[input.layoutName];
  } else if (input.layoutName) {
    // Unknown layout name -- fall back to selectLayout
    errors.push(`Layout "${input.layoutName}" not found, using auto-selection`);
    layout = selectLayout(input.content, []);
  } else {
    layout = selectLayout(input.content, []);
  }

  // 3. Optionally apply variation
  if (input.variationSeed !== undefined) {
    layout = generateVariation(layout, input.variationSeed);
  }

  const layoutName = layout.name;

  // 4. Create grid from default tokens
  const tokens: DesignTokens = defaultTokens;
  const grid = Grid.createGrid(tokens);

  // 5. Resolve layout to absolute rects
  let resolvedElements = resolveLayout(layout, grid, tokens);

  // 6. Apply balance
  const balanceInputs = resolvedElements.map(toBalanceElement);
  const balanced = balanceComposition(balanceInputs);
  resolvedElements = applyBalancedPositions(resolvedElements, balanced);

  // 7. Generate accents if enabled (default true)
  const addAccents = input.addAccents !== false;
  let accents: AccentElement[] = [];
  if (addAccents) {
    accents = generateAccents(layout, brand, brand.style ?? "corporate");
  }

  // 8. Map content to elements
  const textMap = mapContentToElements(resolvedElements, input.content);
  const imageMap = mapImagesToElements(resolvedElements, input.content);

  // 9. Render each element by type
  // Render shapes first (background shapes should be behind text/images)
  const shapeElements = resolvedElements.filter((el) => el.type === "shape");
  const textElements = resolvedElements.filter((el) => el.type === "text");
  const imageElements = resolvedElements.filter((el) => el.type === "image");

  // 9a. Render shape elements
  for (const el of shapeElements) {
    try {
      const fillColor = getShapeFillColor(el.role, palette);
      await renderShapeElement(input.slideIndex, el, fillColor);
      elementsPlaced++;
    } catch (err) {
      errors.push(`Shape "${el.id}": ${String(err)}`);
    }
  }

  // 9b. Render image elements
  for (const el of imageElements) {
    const filePath = imageMap.get(el.id);
    if (!filePath) continue; // No image content for this element
    try {
      await renderImageElement(input.slideIndex, el, filePath);
      elementsPlaced++;
    } catch (err) {
      errors.push(`Image "${el.id}": ${String(err)}`);
    }
  }

  // 9c. Render text elements
  for (const el of textElements) {
    const text = textMap.get(el.id);
    if (!text) continue; // No text content for this element
    try {
      const typeRole = elementRoleToTypeRole(el.role);
      const style = typography[typeRole];

      // Determine text color: use palette.textPrimary as default,
      // then ensure contrast against the background.
      let textColor = style.color ?? palette.textPrimary;
      textColor = ensureContrast(textColor, palette.background, 4.5);

      await renderTextElement(input.slideIndex, el, text, style, textColor);
      elementsPlaced++;
    } catch (err) {
      errors.push(`Text "${el.id}": ${String(err)}`);
    }
  }

  // 9d. Render accent elements
  if (addAccents) {
    for (const accent of accents) {
      try {
        await renderAccentElement(input.slideIndex, accent);
        accentsPlaced++;
      } catch (err) {
        errors.push(`Accent: ${String(err)}`);
      }
    }
  }

  return {
    slideIndex: input.slideIndex,
    layoutName,
    elementsPlaced,
    accentsPlaced,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Deck composition
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Transition helpers
// ---------------------------------------------------------------------------

/** Map brand style to a Keynote transition effect and duration. */
function getTransitionForStyle(
  brandStyle: BrandStyle,
  isSection: boolean,
): { effect: string; duration: number } {
  if (isSection) {
    return { effect: "fade through color", duration: 0.8 };
  }
  switch (brandStyle) {
    case "minimal":
      return { effect: "dissolve", duration: 0.5 };
    case "bold":
      return { effect: "push", duration: 0.8 };
    case "elegant":
      return { effect: "dissolve", duration: 1.0 };
    case "playful":
      return { effect: "magic move", duration: 0.7 };
    case "corporate":
      return { effect: "dissolve", duration: 0.6 };
  }
}

/**
 * Apply a transition to a Keynote slide via AppleScript.
 */
async function applyTransition(
  slideIndex: number,
  effect: string,
  duration: number,
): Promise<void> {
  const script = keynoteScript(
    `set transition properties of slide ${slideIndex} of document 1 to {transition effect:${effect}, transition duration:${duration}}`
  );
  await runAppleScript(script);
}

// ---------------------------------------------------------------------------
// Deck composition
// ---------------------------------------------------------------------------

/**
 * Compose an entire deck by iterating over multiple slide inputs.
 *
 * Tracks previously used layout names and passes them to selectLayout
 * for variety across slides. Optionally applies transitions and progress
 * indicators for a cohesive multi-slide experience.
 *
 * @param inputs - Array of composition inputs, one per slide.
 * @param options - Optional deck-level settings.
 * @returns Array of results, one per slide.
 */
export async function composeDeck(
  inputs: SlideComposerInput[],
  options?: {
    autoTransitions?: boolean;
    showProgress?: boolean;
  },
): Promise<SlideComposerResult[]> {
  const results: SlideComposerResult[] = [];
  const usedLayouts: string[] = [];
  const autoTransitions = options?.autoTransitions !== false;
  const showProgress = options?.showProgress ?? false;

  // Resolve the brand once for deck-level features
  const deckBrand = await resolveBrand(inputs[0]?.brand);
  const { palette } = brandToTokens(deckBrand);
  const brandStyle: BrandStyle = deckBrand.style ?? "corporate";

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];

    // If no explicit layout, use selectLayout with previously used layouts
    let effectiveInput = input;
    if (!input.layoutName) {
      const selected = selectLayout(input.content, usedLayouts);
      effectiveInput = { ...input, layoutName: selected.name };
    }

    const result = await composeSlide(effectiveInput);
    results.push(result);
    usedLayouts.push(result.layoutName);

    // Apply progress indicators
    if (showProgress && inputs.length > 1) {
      try {
        const progressElements = generateProgressIndicator(
          i, inputs.length, brandStyle, palette,
        );
        for (const accent of progressElements) {
          await renderAccentElement(input.slideIndex, accent);
        }
      } catch {
        // Progress indicators are non-critical
      }
    }

    // Apply transitions between slides
    if (autoTransitions && i > 0) {
      try {
        const isSection = result.layoutName.includes("section") || result.layoutName.includes("title");
        const { effect, duration } = getTransitionForStyle(brandStyle, isSection);
        await applyTransition(input.slideIndex, effect, duration);
      } catch {
        // Transitions are non-critical
      }
    }
  }

  return results;
}
