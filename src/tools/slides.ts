import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  runAppleScript,
  keynoteScript,
  escapeAppleScriptString,
} from "../applescript.js";

export function registerSlideTools(server: McpServer): void {
  // ── add_slide ────────────────────────────────────────────────────────
  server.tool(
    "add_slide",
    "Adds a new slide to the frontmost presentation. Optionally specify position and master slide name.",
    {
      position: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("1-based position to insert the slide at. If omitted, appends at the end."),
      masterSlideName: z
        .string()
        .optional()
        .describe("Name of the master slide (layout) to use, e.g. 'Title & Subtitle', 'Blank'."),
    },
    async ({ position, masterSlideName }) => {
      try {
        let masterRef = "";
        if (masterSlideName) {
          const safeName = escapeAppleScriptString(masterSlideName);
          masterRef = ` with properties {base slide:master slide "${safeName}" of front document}`;
        }

        let script: string;
        if (position !== undefined) {
          script = keynoteScript(
            `  tell front document
    set newSlide to make new slide at before slide ${position}${masterRef}
    return slide number of newSlide
  end tell`
          );
        } else {
          script = keynoteScript(
            `  tell front document
    set newSlide to make new slide at end${masterRef}
    return slide number of newSlide
  end tell`
          );
        }

        const result = await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                slideIndex: parseInt(result, 10),
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

  // ── delete_slide ─────────────────────────────────────────────────────
  server.tool(
    "delete_slide",
    "Removes a slide by its 1-based index from the frontmost presentation.",
    {
      slideIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the slide to delete"),
    },
    async ({ slideIndex }) => {
      try {
        const script = keynoteScript(
          `  tell front document
    set slideCount to count of slides
    if ${slideIndex} > slideCount then
      error "Slide index ${slideIndex} is out of range. Document has " & slideCount & " slides."
    end if
    delete slide ${slideIndex}
    return slideCount - 1
  end tell`
        );

        const result = await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                remainingSlides: parseInt(result, 10),
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

  // ── duplicate_slide ──────────────────────────────────────────────────
  server.tool(
    "duplicate_slide",
    "Duplicates a slide by its 1-based index in the frontmost presentation.",
    {
      slideIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the slide to duplicate"),
    },
    async ({ slideIndex }) => {
      try {
        const script = keynoteScript(
          `  tell front document
    set slideCount to count of slides
    if ${slideIndex} > slideCount then
      error "Slide index ${slideIndex} is out of range. Document has " & slideCount & " slides."
    end if
    duplicate slide ${slideIndex}
    return count of slides
  end tell`
        );

        const result = await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                totalSlides: parseInt(result, 10),
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

  // ── move_slide ───────────────────────────────────────────────────────
  server.tool(
    "move_slide",
    "Moves a slide from one position to another in the frontmost presentation.",
    {
      fromIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the slide to move"),
      toIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based target position for the slide"),
    },
    async ({ fromIndex, toIndex }) => {
      try {
        if (fromIndex === toIndex) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: true,
                  message: "Slide is already at the target position",
                }),
              },
            ],
          };
        }

        // AppleScript strategy: duplicate the slide at its source, then move the
        // copy to the destination, and delete the original. Keynote does not have
        // a direct "move slide" command, so we need to use a workaround.
        // Alternative: use `move slide X to before/after slide Y`.
        const script = keynoteScript(
          `  tell front document
    set slideCount to count of slides
    if ${fromIndex} > slideCount then
      error "fromIndex ${fromIndex} is out of range. Document has " & slideCount & " slides."
    end if
    if ${toIndex} > slideCount then
      error "toIndex ${toIndex} is out of range. Document has " & slideCount & " slides."
    end if
    if ${toIndex} > ${fromIndex} then
      move slide ${fromIndex} to after slide ${toIndex}
    else
      move slide ${fromIndex} to before slide ${toIndex}
    end if
    return count of slides
  end tell`
        );

        const result = await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                totalSlides: parseInt(result, 10),
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

  // ── get_slide_count ──────────────────────────────────────────────────
  server.tool(
    "get_slide_count",
    "Returns the total number of slides in the frontmost presentation.",
    {},
    async () => {
      try {
        const script = keynoteScript(
          `  return count of slides of front document`
        );

        const result = await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                slideCount: parseInt(result, 10),
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

  // ── list_slides ──────────────────────────────────────────────────────
  server.tool(
    "list_slides",
    "Returns an array of all slides in the frontmost presentation with index, title text, and layout name.",
    {},
    async () => {
      try {
        const script = keynoteScript(`  set output to ""
  tell front document
    set slideCount to count of slides
    if slideCount is 0 then
      return "[]"
    end if
    repeat with i from 1 to slideCount
      set s to slide i
      set layoutName to name of base slide of s
      set titleText to ""
      try
        set titleText to object text of default title item of s
      on error
        set titleText to ""
      end try
      set output to output & i & "|||" & titleText & "|||" & layoutName
      if i < slideCount then
        set output to output & "%%%"
      end if
    end repeat
  end tell
  return output`);

        const result = await runAppleScript(script);

        if (result === "[]" || result === "") {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ success: true, slides: [] }),
              },
            ],
          };
        }

        const slides = result.split("%%%").map((entry) => {
          const parts = entry.split("|||");
          return {
            index: parseInt(parts[0]?.trim() ?? "0", 10),
            title: parts[1]?.trim() ?? "",
            layout: parts[2]?.trim() ?? "",
          };
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: true, slides }),
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

  // ── get_slide_layout_names ───────────────────────────────────────────
  server.tool(
    "get_slide_layout_names",
    "Lists all available master slide (layout) names for the current theme of the frontmost presentation.",
    {},
    async () => {
      try {
        const script = keynoteScript(`  tell front document
    set masterNames to {}
    set masters to master slides
    repeat with m in masters
      set end of masterNames to name of m
    end repeat
    set AppleScript's text item delimiters to "|||"
    set output to masterNames as text
    set AppleScript's text item delimiters to ""
    return output
  end tell`);

        const result = await runAppleScript(script);
        const layouts = result
          .split("|||")
          .map((n) => n.trim())
          .filter((n) => n.length > 0);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: true, layouts }),
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
