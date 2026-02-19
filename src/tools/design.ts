/**
 * Design MCP Tools (US-011, US-012, US-013).
 *
 * Exposes the design engine to Claude via MCP tool registration:
 * - design_slide: Compose a single slide with automatic layout, typography, and color
 * - design_deck: Compose multiple slides with consistent branding and layout variety
 * - set_brand: Set brand configuration for subsequent design operations
 * - get_brand: Extract brand configuration from the active Keynote theme
 * - list_layouts: List all available layouts in the library
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  composeSlide,
  composeDeck,
} from "../design/composer.js";
import type { SlideComposerInput } from "../design/composer.js";
import type { BrandConfig } from "../design/brand.js";
import { resolveBrand, brandToTokens, extractThemeColors } from "../design/brand.js";
import { layoutLibrary } from "../design/layout-library.js";
import type { SlideContent } from "../design/variations.js";

// ---------------------------------------------------------------------------
// Module-level state for set_brand
// ---------------------------------------------------------------------------

let currentBrand: Partial<BrandConfig> = {};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Merge the module-level currentBrand with per-call brand overrides.
 * Per-call settings take priority over the stored brand.
 */
function mergeBrand(perCall?: Partial<BrandConfig>): Partial<BrandConfig> | undefined {
  const hasStored = Object.keys(currentBrand).length > 0;
  const hasPerCall = perCall !== undefined && Object.keys(perCall).length > 0;

  if (!hasStored && !hasPerCall) return undefined;
  if (!hasStored) return perCall;
  if (!hasPerCall) return { ...currentBrand };

  // Per-call values override stored brand
  return { ...currentBrand, ...perCall };
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerDesignTools(server: McpServer): void {
  // ---------- design_slide (US-011) ----------
  server.tool(
    "design_slide",
    "Designs a complete slide with automatic layout, typography, and color based on content and optional brand settings",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      title: z.string().optional().describe("Slide title text"),
      subtitle: z.string().optional().describe("Slide subtitle text"),
      body: z.string().optional().describe("Body text content"),
      bodyItems: z.array(z.string()).optional().describe("Bullet point items"),
      quote: z.string().optional().describe("Quote text"),
      attribution: z.string().optional().describe("Quote attribution"),
      imagePaths: z.array(z.string()).optional().describe("Array of absolute file paths to images"),
      stats: z.array(z.object({ value: z.string(), label: z.string() })).optional().describe("Statistics with value/label pairs"),
      layoutName: z.string().optional().describe("Specific layout name from the library (e.g. 'title-center', 'content-left')"),
      primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().describe("Brand primary color as hex"),
      style: z.enum(["minimal", "bold", "elegant", "playful", "corporate"]).optional().describe("Visual style preset"),
      variationSeed: z.number().optional().describe("Seed for deterministic layout variation"),
      addAccents: z.boolean().optional().describe("Whether to add decorative accents (default true)"),
    },
    async (params) => {
      try {
        // Build SlideContent from params
        const content: SlideContent = {};
        if (params.title) content.title = params.title;
        if (params.subtitle) content.subtitle = params.subtitle;
        if (params.body) content.body = params.body;
        if (params.bodyItems) content.bodyItems = params.bodyItems;
        if (params.quote) content.quote = params.quote;
        if (params.attribution) content.attribution = params.attribution;
        if (params.imagePaths) content.imagePaths = params.imagePaths;
        if (params.stats) content.stats = params.stats;

        // Build per-call brand config from params
        const perCallBrand: Partial<BrandConfig> = {};
        if (params.primaryColor) perCallBrand.primaryColor = params.primaryColor;
        if (params.style) perCallBrand.style = params.style;

        // Build composer input
        const input: SlideComposerInput = {
          slideIndex: params.slideIndex,
          content,
          layoutName: params.layoutName,
          brand: mergeBrand(perCallBrand),
          variationSeed: params.variationSeed,
          addAccents: params.addAccents,
        };

        const result = await composeSlide(input);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: false, error: String(error) }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------- design_deck (US-012) ----------
  server.tool(
    "design_deck",
    "Designs multiple slides at once with automatic layout variety and consistent branding",
    {
      slides: z.array(z.object({
        slideIndex: z.number().int().min(1).describe("1-based slide index"),
        title: z.string().optional(),
        subtitle: z.string().optional(),
        body: z.string().optional(),
        bodyItems: z.array(z.string()).optional(),
        quote: z.string().optional(),
        attribution: z.string().optional(),
        imagePaths: z.array(z.string()).optional(),
        stats: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
        layoutName: z.string().optional(),
      })).describe("Array of slide content definitions"),
      primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().describe("Brand primary color"),
      style: z.enum(["minimal", "bold", "elegant", "playful", "corporate"]).optional().describe("Visual style"),
      addAccents: z.boolean().optional().describe("Add decorative accents"),
    },
    async (params) => {
      try {
        // Build per-call brand config
        const perCallBrand: Partial<BrandConfig> = {};
        if (params.primaryColor) perCallBrand.primaryColor = params.primaryColor;
        if (params.style) perCallBrand.style = params.style;

        const mergedBrand = mergeBrand(perCallBrand);

        // Convert each slide to SlideComposerInput
        const inputs: SlideComposerInput[] = params.slides.map((slide) => {
          const content: SlideContent = {};
          if (slide.title) content.title = slide.title;
          if (slide.subtitle) content.subtitle = slide.subtitle;
          if (slide.body) content.body = slide.body;
          if (slide.bodyItems) content.bodyItems = slide.bodyItems;
          if (slide.quote) content.quote = slide.quote;
          if (slide.attribution) content.attribution = slide.attribution;
          if (slide.imagePaths) content.imagePaths = slide.imagePaths;
          if (slide.stats) content.stats = slide.stats;

          return {
            slideIndex: slide.slideIndex,
            content,
            layoutName: slide.layoutName,
            brand: mergedBrand,
            addAccents: params.addAccents,
          };
        });

        const results = await composeDeck(inputs);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: true, slides: results }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: false, error: String(error) }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------- set_brand (US-013) ----------
  server.tool(
    "set_brand",
    "Sets brand configuration for subsequent design_slide and design_deck operations. Values persist until changed or cleared.",
    {
      primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().describe("Brand primary color as hex"),
      secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().describe("Brand secondary color as hex"),
      accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().describe("Brand accent color as hex"),
      backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().describe("Slide background color as hex"),
      fontPrimary: z.string().optional().describe("Primary font name (e.g. 'Helvetica Neue', 'Georgia')"),
      fontSecondary: z.string().optional().describe("Secondary/body font name"),
      style: z.enum(["minimal", "bold", "elegant", "playful", "corporate"]).optional().describe("Visual style preset"),
    },
    async (params) => {
      try {
        // Update stored brand config, merging with existing values
        if (params.primaryColor !== undefined) currentBrand.primaryColor = params.primaryColor;
        if (params.secondaryColor !== undefined) currentBrand.secondaryColor = params.secondaryColor;
        if (params.accentColor !== undefined) currentBrand.accentColor = params.accentColor;
        if (params.backgroundColor !== undefined) currentBrand.backgroundColor = params.backgroundColor;
        if (params.fontPrimary !== undefined) currentBrand.fontPrimary = params.fontPrimary;
        if (params.fontSecondary !== undefined) currentBrand.fontSecondary = params.fontSecondary;
        if (params.style !== undefined) currentBrand.style = params.style;

        // Resolve the full brand to show what will be used
        const resolved = await resolveBrand(currentBrand);
        const { palette, typography } = brandToTokens(resolved);

        // Build a typography summary (just the key roles)
        const typographySummary = {
          display: { font: typography.display.fontName, size: typography.display.fontSize, weight: typography.display.fontWeight },
          heading: { font: typography.heading.fontName, size: typography.heading.fontSize, weight: typography.heading.fontWeight },
          body: { font: typography.body.fontName, size: typography.body.fontSize, weight: typography.body.fontWeight },
          caption: { font: typography.caption.fontName, size: typography.caption.fontSize, weight: typography.caption.fontWeight },
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                message: "Brand configuration updated",
                storedBrand: currentBrand,
                resolvedBrand: resolved,
                palette,
                typographySummary,
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: false, error: String(error) }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------- get_brand (US-013) ----------
  server.tool(
    "get_brand",
    "Gets current brand configuration from the active Keynote theme, merged with any previously set brand overrides",
    {},
    async () => {
      try {
        const themeBrand = await extractThemeColors();
        const resolved = await resolveBrand(currentBrand);
        const { palette, typography } = brandToTokens(resolved);

        // Build a typography summary
        const typographySummary = {
          display: { font: typography.display.fontName, size: typography.display.fontSize, weight: typography.display.fontWeight },
          heading: { font: typography.heading.fontName, size: typography.heading.fontSize, weight: typography.heading.fontWeight },
          subheading: { font: typography.subheading.fontName, size: typography.subheading.fontSize, weight: typography.subheading.fontWeight },
          body: { font: typography.body.fontName, size: typography.body.fontSize, weight: typography.body.fontWeight },
          caption: { font: typography.caption.fontName, size: typography.caption.fontSize, weight: typography.caption.fontWeight },
          quote: { font: typography.quote.fontName, size: typography.quote.fontSize, weight: typography.quote.fontWeight },
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                themeBrand,
                storedOverrides: Object.keys(currentBrand).length > 0 ? currentBrand : null,
                resolvedBrand: resolved,
                palette,
                typographySummary,
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: false, error: String(error) }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------- list_layouts (US-013) ----------
  server.tool(
    "list_layouts",
    "Lists all available slide layouts with descriptions, categories, and element details",
    {
      category: z.enum(["title", "content", "section", "comparison", "media", "data", "quote", "closing"]).optional()
        .describe("Filter by layout category"),
    },
    async ({ category }) => {
      try {
        const allEntries = Object.entries(layoutLibrary);

        // Filter by category if provided
        const filtered = category
          ? allEntries.filter(([, layout]) => layout.category === category)
          : allEntries;

        const layouts = filtered.map(([name, layout]) => {
          // Count elements by type
          const textCount = layout.elements.filter((el) => el.type === "text").length;
          const imageCount = layout.elements.filter((el) => el.type === "image").length;
          const shapeCount = layout.elements.filter((el) => el.type === "shape").length;

          // List element roles
          const roles = layout.elements.map((el) => el.role);

          return {
            name,
            description: layout.description,
            category: layout.category,
            elementCount: layout.elements.length,
            elements: { text: textCount, image: imageCount, shape: shapeCount },
            roles,
          };
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                count: layouts.length,
                ...(category ? { filteredBy: category } : {}),
                layouts,
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: false, error: String(error) }),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
