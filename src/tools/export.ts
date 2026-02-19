import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  runAppleScript,
  escapeAppleScriptString,
  keynoteScript,
} from "../applescript.js";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export function registerExportTools(server: McpServer): void {
  // ── export_to_pdf ───────────────────────────────────────────────────────
  server.tool(
    "export_to_pdf",
    "Exports the frontmost Keynote presentation as a PDF file",
    {
      filePath: z
        .string()
        .describe("Absolute POSIX path for the output PDF file (e.g. /Users/me/Desktop/presentation.pdf)"),
    },
    async ({ filePath }) => {
      try {
        const safePath = escapeAppleScriptString(filePath);
        const script = keynoteScript(
          `export document 1 to file ((POSIX file "${safePath}") as string) as PDF`
        );

        await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                filePath,
                format: "PDF",
                message: `Presentation exported as PDF to ${filePath}`,
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

  // ── export_to_images ────────────────────────────────────────────────────
  server.tool(
    "export_to_images",
    "Exports all slides of the frontmost presentation as individual image files to a directory",
    {
      directoryPath: z
        .string()
        .describe("Absolute POSIX path to the output directory (must already exist)"),
      format: z
        .enum(["PNG", "JPEG"])
        .optional()
        .default("PNG")
        .describe("Image format: PNG or JPEG (default: PNG)"),
    },
    async ({ directoryPath, format }) => {
      try {
        const safePath = escapeAppleScriptString(directoryPath);
        const imageFormat = format === "JPEG" ? "JPEG" : "PNG";
        const script = keynoteScript(
          `export document 1 to file ((POSIX file "${safePath}") as string) as slide images with properties {image format:${imageFormat}}`
        );

        await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                directoryPath,
                format: imageFormat,
                message: `Slides exported as ${imageFormat} images to ${directoryPath}`,
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

  // ── export_to_pptx ─────────────────────────────────────────────────────
  server.tool(
    "export_to_pptx",
    "Exports the frontmost Keynote presentation as a Microsoft PowerPoint (.pptx) file",
    {
      filePath: z
        .string()
        .describe("Absolute POSIX path for the output .pptx file"),
    },
    async ({ filePath }) => {
      try {
        const safePath = escapeAppleScriptString(filePath);
        const script = keynoteScript(
          `export document 1 to file ((POSIX file "${safePath}") as string) as Microsoft PowerPoint`
        );

        await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                filePath,
                format: "Microsoft PowerPoint",
                message: `Presentation exported as PowerPoint to ${filePath}`,
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

  // ── export_slide_to_image ───────────────────────────────────────────────
  server.tool(
    "export_slide_to_image",
    "Exports a single slide as an image file. Exports all slides to a temporary directory, " +
    "then copies the specific slide image to the target path.",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      filePath: z
        .string()
        .describe("Absolute POSIX path for the output image file"),
      format: z
        .enum(["PNG", "JPEG"])
        .optional()
        .default("PNG")
        .describe("Image format: PNG or JPEG (default: PNG)"),
    },
    async ({ slideIndex, filePath, format }) => {
      try {
        const imageFormat = format === "JPEG" ? "JPEG" : "PNG";
        const extension = imageFormat === "JPEG" ? "jpeg" : "png";

        // Create a unique temporary directory for the export
        const tmpResult = await execFileAsync("mktemp", ["-d"]);
        const tmpDir = tmpResult.stdout.trim();

        try {
          // Export all slides to the temp directory
          const safeTmpDir = escapeAppleScriptString(tmpDir);
          const exportScript = keynoteScript(
            `export document 1 to file ((POSIX file "${safeTmpDir}") as string) as slide images with properties {image format:${imageFormat}}`
          );
          await runAppleScript(exportScript);

          // Keynote exports slides with names like "Slide001.png", "Slide002.png", etc.
          // The exact naming can vary, so we list the directory and find the right file.
          const lsResult = await execFileAsync("ls", ["-1", tmpDir]);
          const files = lsResult.stdout.trim().split("\n").filter(Boolean).sort();

          if (files.length === 0) {
            throw new Error("No slide images were exported");
          }

          if (slideIndex > files.length) {
            throw new Error(
              `Slide index ${slideIndex} is out of range. Only ${files.length} slides were exported.`
            );
          }

          // Select the file for the requested slide (1-based to 0-based)
          const sourceFile = `${tmpDir}/${files[slideIndex - 1]}`;
          const safeFilePath = escapeAppleScriptString(filePath);

          // Copy the specific slide image to the target path
          await execFileAsync("cp", [sourceFile, filePath]);

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: true,
                  slideIndex,
                  filePath,
                  format: imageFormat,
                  message: `Slide ${slideIndex} exported as ${imageFormat} to ${filePath}`,
                }),
              },
            ],
          };
        } finally {
          // Clean up the temporary directory
          try {
            await execFileAsync("rm", ["-rf", tmpDir]);
          } catch {
            // Ignore cleanup errors
          }
        }
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
