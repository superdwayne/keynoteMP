import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  runAppleScript,
  runJXA,
  escapeAppleScriptString,
  keynoteScript,
} from "../applescript.js";

/**
 * Converts a hex color string (e.g. "#FF0000") to Keynote's RGB format
 * where each channel is scaled to 0-65535.
 */
function hexToKeynoteRGB(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace(/^#/, "");
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return {
    r: Math.round((r / 255) * 65535),
    g: Math.round((g / 255) * 65535),
    b: Math.round((b / 255) * 65535),
  };
}

export function registerThemeTools(server: McpServer): void {
  // ── list_themes ─────────────────────────────────────────────────────
  server.tool(
    "list_themes",
    "Lists available Keynote themes. Attempts to query Keynote directly; falls back to a curated list of standard themes.",
    {},
    async () => {
      try {
        // Try to get themes directly from Keynote
        const script = keynoteScript(
          `  set themeNames to {}
  set themeList to every theme
  repeat with t in themeList
    set end of themeNames to name of t
  end repeat
  set AppleScript's text item delimiters to "|||"
  return themeNames as text`
        );
        const result = await runAppleScript(script);

        if (result && result.length > 0) {
          const themes = result.split("|||").map((name) => name.trim());
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: true,
                  source: "keynote",
                  themes,
                }),
              },
            ],
          };
        }
      } catch {
        // Fall through to hardcoded list
      }

      // Fallback: curated list of standard Keynote themes
      const standardThemes = [
        "White",
        "Black",
        "Gradient",
        "Classic",
        "Modern Type",
        "Minimal",
        "Bold",
        "Showcase",
        "Academy",
        "Blueprint",
        "Craft",
        "Exhibition",
        "Artisan",
        "Editorial",
        "Slate",
        "Industrial",
        "Parchment",
        "Harmony",
        "Renaissance",
        "Photo Essay",
        "Photo Portfolio",
        "Modern Portfolio",
        "Statement",
        "Impactful",
        "Basic White",
        "Basic Black",
      ];

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              source: "standard_list",
              note: "Could not query Keynote directly. Showing standard built-in themes. Actual availability may vary by Keynote version.",
              themes: standardThemes,
            }),
          },
        ],
      };
    }
  );

  // ── apply_theme ─────────────────────────────────────────────────────
  server.tool(
    "apply_theme",
    "Applies a theme to the current Keynote presentation. This changes the document theme, updating master slides and default styling.",
    {
      themeName: z
        .string()
        .describe("Name of the Keynote theme to apply (e.g. 'White', 'Black', 'Gradient')"),
    },
    async ({ themeName }) => {
      try {
        const safeTheme = escapeAppleScriptString(themeName);
        const script = keynoteScript(
          `  set themeList to every theme
  set targetTheme to missing value
  repeat with t in themeList
    if name of t is "${safeTheme}" then
      set targetTheme to t
      exit repeat
    end if
  end repeat
  if targetTheme is missing value then
    error "Theme \\"${safeTheme}\\" not found. Use list_themes to see available themes."
  end if
  set document theme of front document to targetTheme
  return name of document theme of front document`
        );
        const result = await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                appliedTheme: result,
                message: `Theme "${result}" applied to the presentation`,
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ── set_slide_background_color ──────────────────────────────────────
  server.tool(
    "set_slide_background_color",
    "Sets a solid background color on a slide. Provide a hex color string like '#FF0000' for red.",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .describe("Hex color string (e.g. '#FF0000' for red, '#FFFFFF' for white)"),
    },
    async ({ slideIndex, color }) => {
      try {
        const rgb = hexToKeynoteRGB(color);
        const slideRef = `slide ${slideIndex} of front document`;
        // Use JXA for more reliable background color manipulation
        const script = `
          var app = Application("Keynote");
          var slide = app.documents[0].slides[${slideIndex - 1}];
          slide.backgroundColor = [${rgb.r}, ${rgb.g}, ${rgb.b}];
          JSON.stringify({
            success: true,
            slideIndex: ${slideIndex},
            color: "${color}",
            keynoteRGB: { r: ${rgb.r}, g: ${rgb.g}, b: ${rgb.b} },
            message: "Background color set on slide ${slideIndex}"
          });
        `;

        const result = await runJXA(script);
        return {
          content: [
            {
              type: "text" as const,
              text: result || JSON.stringify({
                success: true,
                slideIndex,
                color,
                message: `Background color set on slide ${slideIndex}`,
              }),
            },
          ],
        };
      } catch (jxaError) {
        // Fallback: try AppleScript approach
        try {
          const rgb = hexToKeynoteRGB(color);
          const script = keynoteScript(
            `  tell slide ${slideIndex} of front document
    set its background fill type to color fill
    set its background color to {${rgb.r}, ${rgb.g}, ${rgb.b}}
  end tell
  return "done"`
          );
          await runAppleScript(script);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: true,
                  slideIndex,
                  color,
                  keynoteRGB: hexToKeynoteRGB(color),
                  message: `Background color set on slide ${slideIndex}`,
                }),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                }),
              },
            ],
            isError: true,
          };
        }
      }
    }
  );

  // ── set_slide_background_image ──────────────────────────────────────
  server.tool(
    "set_slide_background_image",
    "Sets an image file as the background of a slide. The image file must be accessible on the local filesystem.",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      filePath: z
        .string()
        .describe("Absolute path to the image file (JPEG, PNG, TIFF, etc.)"),
    },
    async ({ slideIndex, filePath }) => {
      try {
        const safePathJSON = JSON.stringify(filePath);

        // Use JXA for background image manipulation
        const script = `
          var app = Application("Keynote");
          var slide = app.documents[0].slides[${slideIndex - 1}];
          var filePath = ${safePathJSON};
          slide.backgroundFillType = "image_fill";
          slide.backgroundImage = Path(filePath);
          JSON.stringify({
            success: true,
            slideIndex: ${slideIndex},
            filePath: filePath,
            message: "Background image set on slide ${slideIndex}"
          });
        `;

        const result = await runJXA(script);
        return {
          content: [
            {
              type: "text" as const,
              text: result || JSON.stringify({
                success: true,
                slideIndex,
                filePath,
                message: `Background image set on slide ${slideIndex}`,
              }),
            },
          ],
        };
      } catch (jxaError) {
        // Fallback: try AppleScript approach
        try {
          const safePath = escapeAppleScriptString(filePath);
          const script = keynoteScript(
            `  tell slide ${slideIndex} of front document
    set its background fill type to image fill
    set file name of its background fill image to POSIX file "${safePath}"
  end tell
  return "done"`
          );
          await runAppleScript(script);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: true,
                  slideIndex,
                  filePath,
                  message: `Background image set on slide ${slideIndex}`,
                }),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                }),
              },
            ],
            isError: true,
          };
        }
      }
    }
  );

  // ── get_slide_master ────────────────────────────────────────────────
  server.tool(
    "get_slide_master",
    "Gets the master slide (layout) name for a given slide.",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
    },
    async ({ slideIndex }) => {
      try {
        const script = keynoteScript(
          `  set masterName to name of base layout of slide ${slideIndex} of front document
  return masterName`
        );
        const result = await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                slideIndex,
                masterName: result,
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ── change_slide_master ─────────────────────────────────────────────
  server.tool(
    "change_slide_master",
    "Changes the master slide (layout) of a slide. The master name must match one of the available master slides in the current theme.",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      masterName: z
        .string()
        .describe("Name of the master slide / layout (e.g. 'Title - Center', 'Blank', 'Title & Subtitle', 'Photo', 'Bullets')"),
    },
    async ({ slideIndex, masterName }) => {
      try {
        const safeMaster = escapeAppleScriptString(masterName);
        const script = keynoteScript(
          `  set targetLayout to missing value
  set allLayouts to every master slide of front document
  repeat with ml in allLayouts
    if name of ml is "${safeMaster}" then
      set targetLayout to ml
      exit repeat
    end if
  end repeat
  if targetLayout is missing value then
    -- Collect available master names for error message
    set masterNames to {}
    repeat with ml in allLayouts
      set end of masterNames to name of ml
    end repeat
    set AppleScript's text item delimiters to ", "
    set nameList to masterNames as text
    error "Master slide \\"${safeMaster}\\" not found. Available masters: " & nameList
  end if
  set base layout of slide ${slideIndex} of front document to targetLayout
  return name of base layout of slide ${slideIndex} of front document`
        );
        const result = await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                slideIndex,
                masterName: result,
                message: `Slide ${slideIndex} master changed to "${result}"`,
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
