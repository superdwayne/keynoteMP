import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  runAppleScript,
  runJXA,
  keynoteScript,
} from "../applescript.js";

export function registerSlideshowTools(server: McpServer): void {
  // ── start_slideshow ────────────────────────────────────────────────
  server.tool(
    "start_slideshow",
    "Starts the slideshow of the frontmost Keynote presentation. Optionally start from a specific slide.",
    {
      fromSlide: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("1-based slide number to start from. If omitted, starts from the beginning."),
    },
    async ({ fromSlide }) => {
      try {
        let script: string;

        if (fromSlide !== undefined) {
          script = keynoteScript(
            `  start document 1 from slide ${fromSlide} of document 1
  delay 1
  return "playing"`
          );
        } else {
          script = keynoteScript(
            `  start document 1
  delay 1
  return "playing"`
          );
        }

        await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                message: fromSlide
                  ? `Slideshow started from slide ${fromSlide}`
                  : "Slideshow started from the beginning",
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

  // ── stop_slideshow ─────────────────────────────────────────────────
  server.tool(
    "stop_slideshow",
    "Stops the currently running Keynote slideshow.",
    {},
    async () => {
      try {
        // First check if a slideshow is actually playing
        const checkScript = keynoteScript(`  return playing`);
        const isPlaying = await runAppleScript(checkScript);

        if (isPlaying !== "true") {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: true,
                  message: "No slideshow is currently playing",
                }),
              },
            ],
          };
        }

        const script = keynoteScript(`  stop the slideshow
  return "stopped"`);

        await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                message: "Slideshow stopped",
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

  // ── next_slide ─────────────────────────────────────────────────────
  server.tool(
    "next_slide",
    "Advances to the next slide or build during an active Keynote slideshow.",
    {},
    async () => {
      try {
        // Verify slideshow is running
        const checkScript = keynoteScript(`  return playing`);
        const isPlaying = await runAppleScript(checkScript);

        if (isPlaying !== "true") {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  error: "No slideshow is currently playing. Start a slideshow first.",
                }),
              },
            ],
            isError: true,
          };
        }

        const script = keynoteScript(`  show next`);
        await runAppleScript(script);

        // Get the current slide number after advancing
        const statusScript = `
          var app = Application("Keynote");
          var slideNum = -1;
          try {
            var cs = app.documents[0].currentSlide;
            slideNum = cs.slideNumber();
          } catch(e) {}
          JSON.stringify({ success: true, message: "Advanced to next slide", currentSlide: slideNum });
        `;
        const result = await runJXA(statusScript);
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
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ── previous_slide ─────────────────────────────────────────────────
  server.tool(
    "previous_slide",
    "Goes back to the previous slide or build during an active Keynote slideshow.",
    {},
    async () => {
      try {
        // Verify slideshow is running
        const checkScript = keynoteScript(`  return playing`);
        const isPlaying = await runAppleScript(checkScript);

        if (isPlaying !== "true") {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  error: "No slideshow is currently playing. Start a slideshow first.",
                }),
              },
            ],
            isError: true,
          };
        }

        const script = keynoteScript(`  show previous`);
        await runAppleScript(script);

        // Get the current slide number after going back
        const statusScript = `
          var app = Application("Keynote");
          var slideNum = -1;
          try {
            var cs = app.documents[0].currentSlide;
            slideNum = cs.slideNumber();
          } catch(e) {}
          JSON.stringify({ success: true, message: "Went to previous slide", currentSlide: slideNum });
        `;
        const result = await runJXA(statusScript);
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
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ── go_to_slide ────────────────────────────────────────────────────
  server.tool(
    "go_to_slide",
    "Jumps to a specific slide during an active Keynote slideshow.",
    {
      slideIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the slide to jump to"),
    },
    async ({ slideIndex }) => {
      try {
        // Verify slideshow is running
        const checkScript = keynoteScript(`  return playing`);
        const isPlaying = await runAppleScript(checkScript);

        if (isPlaying !== "true") {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  error: "No slideshow is currently playing. Start a slideshow first.",
                }),
              },
            ],
            isError: true,
          };
        }

        // Validate slide index is in range
        const countScript = keynoteScript(
          `  return count of slides of document 1`
        );
        const countStr = await runAppleScript(countScript);
        const slideCount = parseInt(countStr, 10);

        if (slideIndex > slideCount) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  error: `Slide index ${slideIndex} is out of range. Document has ${slideCount} slides.`,
                }),
              },
            ],
            isError: true,
          };
        }

        const script = keynoteScript(
          `  show slide ${slideIndex} of document 1`
        );
        await runAppleScript(script);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                slideIndex,
                message: `Jumped to slide ${slideIndex}`,
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

  // ── get_slideshow_status ───────────────────────────────────────────
  server.tool(
    "get_slideshow_status",
    "Returns whether a slideshow is currently playing and the current slide number.",
    {},
    async () => {
      try {
        const script = `
          var app = Application("Keynote");
          var isPlaying = app.playing();
          var result = { success: true, playing: isPlaying, currentSlide: null };
          if (isPlaying) {
            try {
              var cs = app.documents[0].currentSlide;
              result.currentSlide = cs.slideNumber();
            } catch(e) {
              result.currentSlide = null;
            }
          }
          JSON.stringify(result);
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
