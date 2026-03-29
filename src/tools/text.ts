import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  runAppleScript,
  runJXA,
  escapeAppleScriptString,
  keynoteScript,
} from "../applescript.js";
import { defaultTokens } from "../design/tokens.js";
import { getTypeStyle } from "../design/typography.js";
import { Grid } from "../design/grid.js";
import { resolveCurrentBrand } from "../design/brand-state.js";
import { brandToTokens } from "../design/brand.js";
import { ensureContrast } from "../design/color.js";
import type { TypeRole } from "../design/typography.js";

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

export function registerTextTools(server: McpServer): void {
  // ---------- set_slide_title ----------
  server.tool(
    "set_slide_title",
    "Sets the title text of a slide",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      text: z.string().describe("The title text to set"),
    },
    async ({ slideIndex, text }) => {
      try {
        const escaped = escapeAppleScriptString(text);
        const script = keynoteScript(
          `set object text of default title item of slide ${slideIndex} of document 1 to "${escaped}"`
        );
        await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                slideIndex,
                message: `Title set on slide ${slideIndex}`,
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
                error: String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------- set_slide_body ----------
  server.tool(
    "set_slide_body",
    "Sets the body text of a slide",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      text: z.string().describe("The body text to set"),
    },
    async ({ slideIndex, text }) => {
      try {
        const escaped = escapeAppleScriptString(text);
        const script = keynoteScript(
          `set object text of default body item of slide ${slideIndex} of document 1 to "${escaped}"`
        );
        await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                slideIndex,
                message: `Body text set on slide ${slideIndex}`,
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
                error: String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------- add_text_item ----------
  server.tool(
    "add_text_item",
    "Adds a new text box to a slide at a specified position and size",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      text: z.string().describe("The text content for the new text box"),
      x: z.number().describe("X position in points from the left edge"),
      y: z.number().describe("Y position in points from the top edge"),
      width: z.number().describe("Width of the text box in points"),
      height: z.number().describe("Height of the text box in points"),
      role: z
        .enum(["display", "heading", "subheading", "body", "bodySmall", "caption", "overline", "quote"])
        .optional()
        .describe("Semantic text role. When provided, auto-applies typography formatting (font, size, bold, color) from the design system type scale"),
      autoPosition: z
        .boolean()
        .optional()
        .describe("When true and x/y/width/height are all at defaults (0, 0, 200, 50), auto-positions the text box using the grid system based on the role"),
    },
    async ({ slideIndex, text, x, y, width, height, role, autoPosition }) => {
      try {
        // Auto-position: compute position/size from grid when enabled
        let finalX = x;
        let finalY = y;
        let finalWidth = width;
        let finalHeight = height;

        if (autoPosition && role) {
          // Role-based grid defaults: [colStart, colSpan, rowStart, rowSpan]
          const roleGridMap: Record<string, [number, number, number, number]> = {
            display:    [2, 8, 2, 2],
            heading:    [1, 8, 1, 1],
            subheading: [1, 8, 2, 1],
            body:       [1, 8, 2, 4],
            bodySmall:  [1, 7, 3, 3],
            caption:    [1, 5, 6, 1],
            overline:   [1, 5, 0, 1],
            quote:      [2, 6, 2, 3],
          };

          const gridParams = roleGridMap[role];
          if (gridParams) {
            const grid = Grid.createGrid(defaultTokens);
            const rect = grid.getCell(gridParams[0], gridParams[1], gridParams[2], gridParams[3]);
            finalX = rect.x;
            finalY = rect.y;
            finalWidth = rect.width;
            finalHeight = rect.height;
          }
        }

        const escapedText = escapeAppleScriptString(text);

        // Create text item via AppleScript `make` — JXA push is unreliable
        // for text items (position/size assignments are silently ignored).
        const commands: string[] = [];
        commands.push(`tell slide ${slideIndex} of document 1`);
        commands.push(`  set newItem to make new text item with properties {object text:"${escapedText}", position:{${finalX}, ${finalY}}, width:${finalWidth}, height:${finalHeight}}`);

        let needsBold = false;

        // Role-based typography: apply font, size, color from the brand-aware design system
        if (role) {
          let typeStyle;
          let textColor: string | undefined;
          try {
            const brand = await resolveCurrentBrand();
            const { palette, typography } = brandToTokens(brand);
            typeStyle = typography[role as TypeRole];
            // Ensure text color has sufficient contrast against brand background
            textColor = typeStyle.color ?? palette.textPrimary;
            textColor = ensureContrast(textColor, palette.background, 4.5);
          } catch {
            // Fall back to default type scale if brand resolution fails
            typeStyle = getTypeStyle(role);
            textColor = typeStyle.color;
          }
          const escapedFont = escapeAppleScriptString(typeStyle.fontName);
          commands.push(`  set font of object text of newItem to "${escapedFont}"`);
          commands.push(`  set size of object text of newItem to ${typeStyle.fontSize}`);
          if (typeStyle.fontWeight === "bold") {
            needsBold = true;
          }
          if (textColor) {
            const rgb = hexToKeynoteRGB(textColor);
            commands.push(`  set color of object text of newItem to {${rgb.r}, ${rgb.g}, ${rgb.b}}`);
          }
        }

        // Read back position and size
        commands.push(`  set newPos to position of newItem`);
        commands.push(`  set newW to width of newItem`);
        commands.push(`  set newH to height of newItem`);
        commands.push(`  set itemCount to count of text items`);
        commands.push(`  return "idx=" & itemCount & ",x=" & item 1 of newPos & ",y=" & item 2 of newPos & ",w=" & newW & ",h=" & newH`);
        commands.push(`end tell`);

        const script = keynoteScript(commands.join("\n"));
        const raw = await runAppleScript(script);

        // Bold must be set outside `tell slide` block — AppleScript
        // restricts access to `bold` within a slide tell context.
        if (needsBold) {
          const boldScript = keynoteScript(
            `set bold of object text of last text item of slide ${slideIndex} of document 1 to true`
          );
          await runAppleScript(boldScript);
        }

        // Parse the read-back values
        const parts = Object.fromEntries(
          raw.split(",").map((p) => {
            const [k, v] = p.split("=");
            return [k, parseFloat(v)];
          })
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                slideIndex,
                itemIndex: parts.idx,
                position: { x: parts.x, y: parts.y },
                size: { width: parts.w, height: parts.h },
                ...(role ? { role, typographyApplied: true } : {}),
                ...(autoPosition && role ? { autoPositioned: true } : {}),
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
                error: String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------- update_text_item ----------
  server.tool(
    "update_text_item",
    "Updates the text content of an existing text item on a slide",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      itemIndex: z.number().int().min(1).describe("1-based text item index"),
      text: z.string().describe("The new text content"),
    },
    async ({ slideIndex, itemIndex, text }) => {
      try {
        const escaped = escapeAppleScriptString(text);
        const script = keynoteScript(
          `set object text of text item ${itemIndex} of slide ${slideIndex} of document 1 to "${escaped}"`
        );
        await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                slideIndex,
                itemIndex,
                message: `Text item ${itemIndex} updated on slide ${slideIndex}`,
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
                error: String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------- delete_text_item ----------
  server.tool(
    "delete_text_item",
    "Removes a text item from a slide",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      itemIndex: z.number().int().min(1).describe("1-based text item index"),
    },
    async ({ slideIndex, itemIndex }) => {
      try {
        const script = keynoteScript(
          `delete text item ${itemIndex} of slide ${slideIndex} of document 1`
        );
        await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                slideIndex,
                itemIndex,
                message: `Text item ${itemIndex} deleted from slide ${slideIndex}`,
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
                error: String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------- list_text_items ----------
  server.tool(
    "list_text_items",
    "Lists all text items on a slide with their content, position, and size",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
    },
    async ({ slideIndex }) => {
      try {
        const script = `
          var app = Application("Keynote");
          var slide = app.documents[0].slides[${slideIndex - 1}];
          var items = slide.textItems();
          var result = [];
          for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var pos = item.position();
            result.push({
              itemIndex: i + 1,
              text: item.objectText(),
              position: { x: pos.x, y: pos.y },
              width: item.width(),
              height: item.height()
            });
          }
          JSON.stringify({ success: true, slideIndex: ${slideIndex}, textItems: result });
        `;
        const result = await runJXA(script);
        return {
          content: [
            {
              type: "text" as const,
              text: result,
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
                error: String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------- format_text ----------
  server.tool(
    "format_text",
    "Formats a text item with font, size, color, bold, italic, and alignment options",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      itemIndex: z.number().int().min(1).describe("1-based text item index"),
      fontName: z.string().optional().describe("Font name (e.g. 'Helvetica', 'Arial')"),
      fontSize: z.number().optional().describe("Font size in points"),
      bold: z.boolean().optional().describe("Whether text should be bold"),
      italic: z.boolean().optional().describe("Whether text should be italic"),
      color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional()
        .describe("Text color as RGB hex string (e.g. '#FF0000' for red)"),
      alignment: z
        .enum(["left", "center", "right"])
        .optional()
        .describe("Text alignment"),
    },
    async ({ slideIndex, itemIndex, fontName, fontSize, bold, italic, color, alignment }) => {
      try {
        const commands: string[] = [];
        const target = `text item ${itemIndex} of slide ${slideIndex} of document 1`;

        if (fontName !== undefined) {
          const escapedFont = escapeAppleScriptString(fontName);
          commands.push(`set font of object text of ${target} to "${escapedFont}"`);
        }

        if (fontSize !== undefined) {
          commands.push(`set size of object text of ${target} to ${fontSize}`);
        }

        if (bold !== undefined) {
          commands.push(`set bold of object text of ${target} to ${bold}`);
        }

        if (italic !== undefined) {
          commands.push(`set italic of object text of ${target} to ${italic}`);
        }

        if (color !== undefined) {
          const rgb = hexToKeynoteRGB(color);
          commands.push(
            `set color of object text of ${target} to {${rgb.r}, ${rgb.g}, ${rgb.b}}`
          );
        }

        if (alignment !== undefined) {
          const alignmentMap: Record<string, string> = {
            left: "left alignment",
            center: "center alignment",
            right: "right alignment",
          };
          commands.push(
            `set alignment of object text of ${target} to ${alignmentMap[alignment]}`
          );
        }

        if (commands.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  error: "No formatting options provided. Specify at least one of: fontName, fontSize, bold, italic, color, alignment.",
                }),
              },
            ],
            isError: true,
          };
        }

        const script = keynoteScript(commands.join("\n"));
        await runAppleScript(script);

        const applied: Record<string, unknown> = {};
        if (fontName !== undefined) applied.fontName = fontName;
        if (fontSize !== undefined) applied.fontSize = fontSize;
        if (bold !== undefined) applied.bold = bold;
        if (italic !== undefined) applied.italic = italic;
        if (color !== undefined) applied.color = color;
        if (alignment !== undefined) applied.alignment = alignment;

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                slideIndex,
                itemIndex,
                applied,
                message: `Formatting applied to text item ${itemIndex} on slide ${slideIndex}`,
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
                error: String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
