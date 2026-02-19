import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  runAppleScript,
  keynoteScript,
  ensureKeynoteRunning,
  escapeAppleScriptString,
} from "../applescript.js";

export function registerPresentationTools(server: McpServer): void {
  // ── create_presentation ──────────────────────────────────────────────
  server.tool(
    "create_presentation",
    "Creates a new blank Keynote presentation. Optionally specify a theme name.",
    {
      themeName: z
        .string()
        .optional()
        .describe("Name of the Keynote theme to use (e.g. 'White', 'Black', 'Gradient')"),
    },
    async ({ themeName }) => {
      try {
        let script: string;

        if (themeName) {
          const safeTheme = escapeAppleScriptString(themeName);
          script = `${ensureKeynoteRunning()}
${keynoteScript(`  set themeList to every theme
  set targetTheme to missing value
  repeat with t in themeList
    if name of t is "${safeTheme}" then
      set targetTheme to t
      exit repeat
    end if
  end repeat
  if targetTheme is missing value then
    error "Theme \\"${safeTheme}\\" not found"
  end if
  set newDoc to make new document with properties {document theme:targetTheme}
  return name of newDoc`)}`;
        } else {
          script = `${ensureKeynoteRunning()}
${keynoteScript(`  set newDoc to make new document
  return name of newDoc`)}`;
        }

        const result = await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: true, name: result }),
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

  // ── open_presentation ────────────────────────────────────────────────
  server.tool(
    "open_presentation",
    "Opens a Keynote presentation (.key file) by file path.",
    {
      filePath: z
        .string()
        .describe("Absolute path to the .key file to open"),
    },
    async ({ filePath }) => {
      try {
        const safePath = escapeAppleScriptString(filePath);
        const script = `${ensureKeynoteRunning()}
${keynoteScript(`  open POSIX file "${safePath}"
  delay 1
  return name of front document`)}`;

        const result = await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: true, name: result }),
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

  // ── save_presentation ────────────────────────────────────────────────
  server.tool(
    "save_presentation",
    "Saves the frontmost Keynote presentation. Optionally specify a file path for save-as.",
    {
      filePath: z
        .string()
        .optional()
        .describe("Absolute file path for save-as. If omitted, saves in place."),
    },
    async ({ filePath }) => {
      try {
        let script: string;

        if (filePath) {
          const safePath = escapeAppleScriptString(filePath);
          script = keynoteScript(
            `  save front document in POSIX file "${safePath}"
  return name of front document`
          );
        } else {
          script = keynoteScript(
            `  save front document
  return name of front document`
          );
        }

        const result = await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: true, name: result }),
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

  // ── close_presentation ───────────────────────────────────────────────
  server.tool(
    "close_presentation",
    "Closes the frontmost Keynote presentation.",
    {
      saving: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to save before closing (default: true)"),
    },
    async ({ saving }) => {
      try {
        const saveOption = saving ? "yes" : "no";
        const script = keynoteScript(
          `  set docName to name of front document
  close front document saving ${saveOption}
  return docName`
        );

        const result = await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: true, closed: result }),
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

  // ── list_presentations ───────────────────────────────────────────────
  server.tool(
    "list_presentations",
    "Lists all currently open Keynote presentations with their names and file paths.",
    {},
    async () => {
      try {
        const script = keynoteScript(`  set output to ""
  set docCount to count of documents
  if docCount is 0 then
    return "[]"
  end if
  repeat with i from 1 to docCount
    set d to document i
    set docName to name of d
    try
      set docFile to POSIX path of (file of d as text)
    on error
      set docFile to "unsaved"
    end try
    set output to output & docName & "|||" & docFile
    if i < docCount then
      set output to output & "%%%"
    end if
  end repeat
  return output`);

        const result = await runAppleScript(script);

        if (result === "[]" || result === "") {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ success: true, presentations: [] }),
              },
            ],
          };
        }

        const presentations = result.split("%%%").map((entry, index) => {
          const [name, filePath] = entry.split("|||");
          return {
            index: index + 1,
            name: name?.trim() ?? "",
            filePath: filePath?.trim() ?? "unsaved",
          };
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: true, presentations }),
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

  // ── get_presentation_info ────────────────────────────────────────────
  server.tool(
    "get_presentation_info",
    "Returns slide count, theme name, dimensions, and file path for a presentation. Defaults to the frontmost presentation.",
    {
      name: z
        .string()
        .optional()
        .describe("Name of the presentation. If omitted, uses the frontmost document."),
    },
    async ({ name }) => {
      try {
        let docRef: string;
        if (name) {
          const safeName = escapeAppleScriptString(name);
          docRef = `document "${safeName}"`;
        } else {
          docRef = "front document";
        }

        const script = keynoteScript(`  set d to ${docRef}
  set docName to name of d
  set slideCount to count of slides of d
  set themeName to name of document theme of d
  set docWidth to width of d
  set docHeight to height of d
  try
    set docFile to POSIX path of (file of d as text)
  on error
    set docFile to "unsaved"
  end try
  return docName & "|||" & slideCount & "|||" & themeName & "|||" & docWidth & "|||" & docHeight & "|||" & docFile`);

        const result = await runAppleScript(script);
        const parts = result.split("|||");

        const info = {
          name: parts[0]?.trim() ?? "",
          slideCount: parseInt(parts[1]?.trim() ?? "0", 10),
          themeName: parts[2]?.trim() ?? "",
          width: parseFloat(parts[3]?.trim() ?? "0"),
          height: parseFloat(parts[4]?.trim() ?? "0"),
          filePath: parts[5]?.trim() ?? "unsaved",
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: true, ...info }),
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
