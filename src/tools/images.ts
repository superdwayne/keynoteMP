import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  runAppleScript,
  escapeAppleScriptString,
  keynoteScript,
} from "../applescript.js";
import { defaultTokens } from "../design/tokens.js";
import { Grid } from "../design/grid.js";

export function registerImageTools(server: McpServer): void {
  // ── add_image ──────────────────────────────────────────────────────────
  server.tool(
    "add_image",
    "Adds an image file to a slide at a given position with optional width and height",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      filePath: z
        .string()
        .describe("Absolute POSIX path to the image file"),
      x: z.number().optional().default(0).describe("X position in points"),
      y: z.number().optional().default(0).describe("Y position in points"),
      width: z
        .number()
        .optional()
        .describe("Width in points (omit to use intrinsic width)"),
      height: z
        .number()
        .optional()
        .describe("Height in points (omit to use intrinsic height)"),
      role: z
        .enum(["hero-image", "thumbnail", "background-image", "icon", "inline", "avatar"])
        .optional()
        .describe("Semantic image role. When provided, applies smart sizing and positioning defaults from the grid system"),
    },
    async ({ slideIndex, filePath, x, y, width, height, role }) => {
      try {
        // Apply role-based defaults when role is provided
        let finalX = x;
        let finalY = y;
        let finalWidth = width;
        let finalHeight = height;

        if (role) {
          if (role === "hero-image" && width === undefined && height === undefined) {
            const grid = Grid.createGrid(defaultTokens);
            const rect = grid.getCell(1, 10, 1, 6);
            if (x === 0) finalX = rect.x;
            if (y === 0) finalY = rect.y;
            finalWidth = rect.width;
            finalHeight = rect.height;
          } else if (role === "thumbnail") {
            if (width === undefined) finalWidth = 200;
            if (height === undefined) finalHeight = 150;
          } else if (role === "background-image") {
            finalX = 0;
            finalY = 0;
            finalWidth = 1024;
            finalHeight = 768;
          } else if (role === "icon") {
            if (width === undefined) finalWidth = 64;
            if (height === undefined) finalHeight = 64;
          } else if (role === "inline") {
            const grid = Grid.createGrid(defaultTokens);
            const rect = grid.getCell(1, 8, 3, 3);
            if (x === 0) finalX = rect.x;
            if (y === 0) finalY = rect.y;
            if (width === undefined) finalWidth = rect.width;
            if (height === undefined) finalHeight = rect.height;
          } else if (role === "avatar") {
            if (width === undefined) finalWidth = 80;
            if (height === undefined) finalHeight = 80;
          }
        }

        const escapedPath = escapeAppleScriptString(filePath);

        // Build the properties record dynamically
        const props: string[] = [];
        props.push(`file: (POSIX file "${escapedPath}" as alias)`);
        props.push(`position: {${finalX}, ${finalY}}`);
        if (finalWidth !== undefined) props.push(`width: ${finalWidth}`);
        if (finalHeight !== undefined) props.push(`height: ${finalHeight}`);

        const script = keynoteScript(
          `tell slide ${slideIndex} of document 1\n` +
            `  set newImage to make new image with properties {${props.join(", ")}}\n` +
            `  set imgPos to position of newImage\n` +
            `  set imgW to width of newImage\n` +
            `  set imgH to height of newImage\n` +
            `  return "x=" & item 1 of imgPos & ",y=" & item 2 of imgPos & ",width=" & imgW & ",height=" & imgH\n` +
            `end tell`
        );

        const raw = await runAppleScript(script);
        // Parse the returned "x=...,y=...,width=...,height=..." string
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
                filePath,
                position: { x: parts.x, y: parts.y },
                width: parts.width,
                height: parts.height,
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

  // ── replace_image ──────────────────────────────────────────────────────
  server.tool(
    "replace_image",
    "Replaces an existing image on a slide with a new image file",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      imageIndex: z.number().int().min(1).describe("1-based image index"),
      filePath: z
        .string()
        .describe("Absolute POSIX path to the replacement image file"),
    },
    async ({ slideIndex, imageIndex, filePath }) => {
      try {
        const escapedPath = escapeAppleScriptString(filePath);

        const script = keynoteScript(
          `set file name of image ${imageIndex} of slide ${slideIndex} of document 1 to (POSIX file "${escapedPath}" as alias)`
        );

        await runAppleScript(script);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                slideIndex,
                imageIndex,
                newFilePath: filePath,
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

  // ── delete_image ───────────────────────────────────────────────────────
  server.tool(
    "delete_image",
    "Removes an image from a slide",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      imageIndex: z.number().int().min(1).describe("1-based image index"),
    },
    async ({ slideIndex, imageIndex }) => {
      try {
        const script = keynoteScript(
          `delete image ${imageIndex} of slide ${slideIndex} of document 1`
        );

        await runAppleScript(script);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                slideIndex,
                imageIndex,
                message: `Image ${imageIndex} deleted from slide ${slideIndex}`,
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

  // ── list_images ────────────────────────────────────────────────────────
  server.tool(
    "list_images",
    "Lists all images on a slide with position, size, and file name info",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
    },
    async ({ slideIndex }) => {
      try {
        const script = keynoteScript(
          `set theSlide to slide ${slideIndex} of document 1\n` +
            `set imgCount to count of images of theSlide\n` +
            `set output to ""\n` +
            `repeat with i from 1 to imgCount\n` +
            `  set img to image i of theSlide\n` +
            `  set imgPos to position of img\n` +
            `  set imgW to width of img\n` +
            `  set imgH to height of img\n` +
            `  set imgFile to file name of img\n` +
            `  set output to output & i & "|" & item 1 of imgPos & "|" & item 2 of imgPos & "|" & imgW & "|" & imgH & "|" & imgFile & "\\n"\n` +
            `end repeat\n` +
            `return imgCount & ":::" & output`
        );

        const raw = await runAppleScript(script);
        const [countStr, dataStr] = raw.split(":::");
        const count = parseInt(countStr, 10);

        const images: Array<{
          index: number;
          x: number;
          y: number;
          width: number;
          height: number;
          fileName: string;
        }> = [];

        if (count > 0 && dataStr) {
          const lines = dataStr.trim().split("\\n").filter(Boolean);
          for (const line of lines) {
            const [idx, xStr, yStr, wStr, hStr, fileName] = line.split("|");
            images.push({
              index: parseInt(idx, 10),
              x: parseFloat(xStr),
              y: parseFloat(yStr),
              width: parseFloat(wStr),
              height: parseFloat(hStr),
              fileName: fileName || "",
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
                imageCount: count,
                images,
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

  // ── set_image_position ─────────────────────────────────────────────────
  server.tool(
    "set_image_position",
    "Repositions and/or resizes an existing image on a slide",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      imageIndex: z.number().int().min(1).describe("1-based image index"),
      x: z.number().optional().describe("New X position in points"),
      y: z.number().optional().describe("New Y position in points"),
      width: z.number().optional().describe("New width in points"),
      height: z.number().optional().describe("New height in points"),
    },
    async ({ slideIndex, imageIndex, x, y, width, height }) => {
      try {
        const statements: string[] = [];
        const imgRef = `image ${imageIndex} of slide ${slideIndex} of document 1`;

        // If x or y is provided, we need to handle position
        if (x !== undefined || y !== undefined) {
          if (x !== undefined && y !== undefined) {
            statements.push(`set position of ${imgRef} to {${x}, ${y}}`);
          } else {
            // Need to read current position first
            statements.push(`set curPos to position of ${imgRef}`);
            const newX = x !== undefined ? x : "item 1 of curPos";
            const newY = y !== undefined ? y : "item 2 of curPos";
            statements.push(
              `set position of ${imgRef} to {${newX}, ${newY}}`
            );
          }
        }

        if (width !== undefined) {
          statements.push(`set width of ${imgRef} to ${width}`);
        }
        if (height !== undefined) {
          statements.push(`set height of ${imgRef} to ${height}`);
        }

        if (statements.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  message:
                    "No properties to update. Provide at least one of: x, y, width, height.",
                }),
              },
            ],
          };
        }

        // Append a return statement to fetch the new state
        statements.push(`set newPos to position of ${imgRef}`);
        statements.push(`set newW to width of ${imgRef}`);
        statements.push(`set newH to height of ${imgRef}`);
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
                imageIndex,
                position: { x: parts.x, y: parts.y },
                width: parts.width,
                height: parts.height,
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
