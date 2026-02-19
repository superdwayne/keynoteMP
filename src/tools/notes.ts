import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  runAppleScript,
  runJXA,
  escapeAppleScriptString,
  keynoteScript,
} from "../applescript.js";

export function registerNotesTools(server: McpServer): void {
  // ---------- set_presenter_notes ----------
  server.tool(
    "set_presenter_notes",
    "Sets the presenter notes for a specific slide",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      notes: z.string().describe("The presenter notes text to set"),
    },
    async ({ slideIndex, notes }) => {
      try {
        const escaped = escapeAppleScriptString(notes);
        const script = keynoteScript(
          `set presenter notes of slide ${slideIndex} of document 1 to "${escaped}"`
        );
        await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                slideIndex,
                message: `Presenter notes set for slide ${slideIndex}`,
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

  // ---------- get_presenter_notes ----------
  server.tool(
    "get_presenter_notes",
    "Gets the presenter notes for a specific slide",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
    },
    async ({ slideIndex }) => {
      try {
        const script = keynoteScript(
          `get presenter notes of slide ${slideIndex} of document 1`
        );
        const result = await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                slideIndex,
                notes: result,
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

  // ---------- get_all_presenter_notes ----------
  server.tool(
    "get_all_presenter_notes",
    "Returns presenter notes for all slides as an array of {slideIndex, notes}",
    {},
    async () => {
      try {
        const script = `
          var app = Application("Keynote");
          var doc = app.documents[0];
          var slides = doc.slides();
          var result = [];
          for (var i = 0; i < slides.length; i++) {
            result.push({
              slideIndex: i + 1,
              notes: slides[i].presenterNotes()
            });
          }
          JSON.stringify({ success: true, slides: result });
        `;
        const jsonResult = await runJXA(script);
        return {
          content: [
            {
              type: "text" as const,
              text: jsonResult,
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
