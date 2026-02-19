import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  runAppleScript,
  keynoteScript,
} from "../applescript.js";
import { resolveBrand, brandToTokens } from "../design/brand.js";

/**
 * Convert a hex colour string (e.g. "#FF0000") to a Keynote-compatible
 * AppleScript RGB literal "{R, G, B}" where each channel is 0-65535.
 */
function hexToKeynoteRGB(hex: string): string {
  const cleaned = hex.replace(/^#/, "");
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  // Keynote uses 16-bit colour channels (0-65535). Scale from 0-255.
  return `{${r * 257}, ${g * 257}, ${b * 257}}`;
}

const SHAPE_TYPE_ENUM = z.enum([
  "rectangle",
  "circle",
  "triangle",
  "arrow_right",
  "arrow_left",
  "star",
  "diamond",
  "line",
]);

export function registerShapeTools(server: McpServer): void {
  // ── add_shape ──────────────────────────────────────────────────────────
  server.tool(
    "add_shape",
    "Adds a shape to a slide with specified type, position, size, and optional fill colour",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      shapeType: SHAPE_TYPE_ENUM.describe(
        "The kind of shape to create"
      ),
      x: z.number().describe("X position in points"),
      y: z.number().describe("Y position in points"),
      width: z.number().describe("Width in points"),
      height: z.number().describe("Height in points"),
      fillColor: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional()
        .describe('Fill colour as hex, e.g. "#FF0000"'),
      role: z
        .enum(["accent-shape", "divider", "background-shape"])
        .optional()
        .describe("Semantic shape role. When provided, applies smart defaults for color and sizing from the brand system"),
    },
    async ({ slideIndex, shapeType, x, y, width, height, fillColor, role }) => {
      // Apply role-based defaults when role is provided
      let effectiveFillColor = fillColor;
      let effectiveWidth = width;
      let effectiveHeight = height;

      if (role) {
        try {
          const brand = await resolveBrand();
          const { palette } = brandToTokens(brand);

          if (role === "accent-shape") {
            if (!fillColor) {
              effectiveFillColor = brand.accentColor ?? palette.accent;
            }
            // Accent shapes are smaller by default -- keep user-provided size if given
          } else if (role === "divider") {
            // Thin line: height=2 for horizontal, width=2 for vertical
            if (shapeType === "line" || effectiveHeight <= effectiveWidth) {
              effectiveHeight = 2;
            } else {
              effectiveWidth = 2;
            }
            if (!fillColor) {
              effectiveFillColor = brand.secondaryColor ?? palette.secondary;
            }
          } else if (role === "background-shape") {
            if (!fillColor) {
              effectiveFillColor = brand.backgroundColor ?? palette.background;
            }
            // Full slide dimensions if no explicit size was provided
            // Use standard 1024x768 as full slide defaults
            effectiveWidth = 1024;
            effectiveHeight = 768;
          }
        } catch {
          // If brand resolution fails, continue without role-based defaults
        }
      }

      const lines: string[] = [];
      lines.push(`tell slide ${slideIndex} of document 1`);
      lines.push(
        `  set newShape to make new shape with properties {position:{${x}, ${y}}, width:${effectiveWidth}, height:${effectiveHeight}}`
      );

      if (effectiveFillColor) {
        const rgb = hexToKeynoteRGB(effectiveFillColor);
        lines.push(
          `  tell newShape`
        );
        lines.push(
          `    set object text to ""`
        );
        lines.push(
          `  end tell`
        );
        // Set fill colour via object properties
        lines.push(
          `  set color of newShape to ${rgb}`
        );
      }

      // Return info about the newly created shape
      lines.push(`  set shapePos to position of newShape`);
      lines.push(`  set shapeW to width of newShape`);
      lines.push(`  set shapeH to height of newShape`);
      lines.push(
        `  return "x=" & item 1 of shapePos & ",y=" & item 2 of shapePos & ",width=" & shapeW & ",height=" & shapeH`
      );
      lines.push(`end tell`);

      const script = keynoteScript(lines.join("\n"));

      try {
        const raw = await runAppleScript(script);
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
                shapeType,
                position: { x: parts.x, y: parts.y },
                width: parts.width,
                height: parts.height,
                fillColor: effectiveFillColor ?? null,
              }),
            },
          ],
        };
      } catch (error) {
        // If the simple approach fails (e.g. `color` property not
        // available at top level), retry without colour and apply
        // colour separately via the object-properties approach.
        if (effectiveFillColor) {
          const fallbackLines: string[] = [];
          fallbackLines.push(`tell slide ${slideIndex} of document 1`);
          fallbackLines.push(
            `  set newShape to make new shape with properties {position:{${x}, ${y}}, width:${effectiveWidth}, height:${effectiveHeight}}`
          );
          fallbackLines.push(`  set shapePos to position of newShape`);
          fallbackLines.push(`  set shapeW to width of newShape`);
          fallbackLines.push(`  set shapeH to height of newShape`);
          fallbackLines.push(
            `  return "x=" & item 1 of shapePos & ",y=" & item 2 of shapePos & ",width=" & shapeW & ",height=" & shapeH`
          );
          fallbackLines.push(`end tell`);

          const fallbackScript = keynoteScript(fallbackLines.join("\n"));
          const raw = await runAppleScript(fallbackScript);
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
                  shapeType,
                  position: { x: parts.x, y: parts.y },
                  width: parts.width,
                  height: parts.height,
                  fillColor: effectiveFillColor,
                  note: "Shape created but fill colour may not have been applied. Use update_shape to set colour.",
                }),
              },
            ],
          };
        }
        throw error;
      }
    }
  );

  // ── delete_shape ───────────────────────────────────────────────────────
  server.tool(
    "delete_shape",
    "Removes a shape from a slide",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      shapeIndex: z.number().int().min(1).describe("1-based shape index"),
    },
    async ({ slideIndex, shapeIndex }) => {
      try {
        const script = keynoteScript(
          `delete shape ${shapeIndex} of slide ${slideIndex} of document 1`
        );

        await runAppleScript(script);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                slideIndex,
                shapeIndex,
                message: `Shape ${shapeIndex} deleted from slide ${slideIndex}`,
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

  // ── list_shapes ────────────────────────────────────────────────────────
  server.tool(
    "list_shapes",
    "Lists all shapes on a slide with position and size information",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
    },
    async ({ slideIndex }) => {
      try {
        // Keynote shapes are accessed as iWork items. We iterate and collect
        // position, width, height, and the object text (which hints at the
        // shape content).
        const script = keynoteScript(
          `set theSlide to slide ${slideIndex} of document 1\n` +
            `set shapeCount to count of shapes of theSlide\n` +
            `set output to ""\n` +
            `repeat with i from 1 to shapeCount\n` +
            `  set s to shape i of theSlide\n` +
            `  set sPos to position of s\n` +
            `  set sW to width of s\n` +
            `  set sH to height of s\n` +
            `  try\n` +
            `    set sText to object text of s\n` +
            `  on error\n` +
            `    set sText to ""\n` +
            `  end try\n` +
            `  set output to output & i & "|" & item 1 of sPos & "|" & item 2 of sPos & "|" & sW & "|" & sH & "|" & sText & "\\n"\n` +
            `end repeat\n` +
            `return shapeCount & ":::" & output`
        );

        const raw = await runAppleScript(script);
        const [countStr, dataStr] = raw.split(":::");
        const count = parseInt(countStr, 10);

        const shapes: Array<{
          index: number;
          x: number;
          y: number;
          width: number;
          height: number;
          objectText: string;
        }> = [];

        if (count > 0 && dataStr) {
          const lines = dataStr.trim().split("\\n").filter(Boolean);
          for (const line of lines) {
            const parts = line.split("|");
            shapes.push({
              index: parseInt(parts[0], 10),
              x: parseFloat(parts[1]),
              y: parseFloat(parts[2]),
              width: parseFloat(parts[3]),
              height: parseFloat(parts[4]),
              objectText: parts.slice(5).join("|"), // text may contain pipes
            });
          }
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                slideIndex,
                shapeCount: count,
                shapes,
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

  // ── update_shape ───────────────────────────────────────────────────────
  server.tool(
    "update_shape",
    "Modifies a shape's position, size, fill colour, border colour, or border width",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      shapeIndex: z.number().int().min(1).describe("1-based shape index"),
      x: z.number().optional().describe("New X position in points"),
      y: z.number().optional().describe("New Y position in points"),
      width: z.number().optional().describe("New width in points"),
      height: z.number().optional().describe("New height in points"),
      fillColor: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional()
        .describe('Fill colour as hex, e.g. "#00FF00"'),
      borderColor: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional()
        .describe('Border/stroke colour as hex, e.g. "#000000"'),
      borderWidth: z
        .number()
        .optional()
        .describe("Border/stroke width in points"),
    },
    async ({
      slideIndex,
      shapeIndex,
      x,
      y,
      width,
      height,
      fillColor,
      borderColor,
      borderWidth,
    }) => {
      try {
        const shapeRef = `shape ${shapeIndex} of slide ${slideIndex} of document 1`;
        const statements: string[] = [];

        // Position
        if (x !== undefined || y !== undefined) {
          if (x !== undefined && y !== undefined) {
            statements.push(`set position of ${shapeRef} to {${x}, ${y}}`);
          } else {
            statements.push(`set curPos to position of ${shapeRef}`);
            const newX = x !== undefined ? String(x) : "item 1 of curPos";
            const newY = y !== undefined ? String(y) : "item 2 of curPos";
            statements.push(
              `set position of ${shapeRef} to {${newX}, ${newY}}`
            );
          }
        }

        // Size
        if (width !== undefined) {
          statements.push(`set width of ${shapeRef} to ${width}`);
        }
        if (height !== undefined) {
          statements.push(`set height of ${shapeRef} to ${height}`);
        }

        // Fill colour
        if (fillColor) {
          const rgb = hexToKeynoteRGB(fillColor);
          statements.push(`set color of ${shapeRef} to ${rgb}`);
        }

        // Border colour
        if (borderColor) {
          const rgb = hexToKeynoteRGB(borderColor);
          statements.push(
            `set stroke color of ${shapeRef} to ${rgb}`
          );
        }

        // Border width
        if (borderWidth !== undefined) {
          statements.push(
            `set stroke width of ${shapeRef} to ${borderWidth}`
          );
        }

        if (statements.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  message:
                    "No properties to update. Provide at least one of: x, y, width, height, fillColor, borderColor, borderWidth.",
                }),
              },
            ],
          };
        }

        // Read back the updated properties
        statements.push(`set newPos to position of ${shapeRef}`);
        statements.push(`set newW to width of ${shapeRef}`);
        statements.push(`set newH to height of ${shapeRef}`);
        statements.push(
          `return "x=" & item 1 of newPos & ",y=" & item 2 of newPos & ",width=" & newW & ",height=" & newH`
        );

        const script = keynoteScript(statements.join("\n"));
        const raw = await runAppleScript(script);

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
                shapeIndex,
                position: { x: parts.x, y: parts.y },
                width: parts.width,
                height: parts.height,
                fillColor: fillColor ?? null,
                borderColor: borderColor ?? null,
                borderWidth: borderWidth ?? null,
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
