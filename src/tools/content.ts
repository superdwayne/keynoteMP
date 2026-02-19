import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runJXA } from "../applescript.js";

export function registerContentTools(server: McpServer): void {
  // ── get_slide_content ──────────────────────────────────────────────
  server.tool(
    "get_slide_content",
    "Returns all content on a specific slide including title, body, text items, images, shapes, tables, and presenter notes.",
    {
      slideIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the slide to extract content from"),
    },
    async ({ slideIndex }) => {
      try {
        // JXA uses 0-based indexing, so subtract 1
        const idx = slideIndex - 1;
        const script = `
          var app = Application("Keynote");
          var doc = app.documents[0];
          var slides = doc.slides();

          if (${idx} >= slides.length) {
            JSON.stringify({
              success: false,
              error: "Slide index ${slideIndex} is out of range. Document has " + slides.length + " slides."
            });
          } else {
            var slide = slides[${idx}];
            var result = {
              success: true,
              slideIndex: ${slideIndex},
              title: null,
              body: null,
              textItems: [],
              images: [],
              shapes: [],
              tables: [],
              presenterNotes: ""
            };

            // Title
            try {
              result.title = slide.defaultTitleItem().objectText();
            } catch(e) {
              result.title = null;
            }

            // Body
            try {
              result.body = slide.defaultBodyItem().objectText();
            } catch(e) {
              result.body = null;
            }

            // Text items
            try {
              var textItems = slide.textItems();
              for (var ti = 0; ti < textItems.length; ti++) {
                var t = textItems[ti];
                var tEntry = { index: ti + 1, text: "", position: null, width: null, height: null };
                try { tEntry.text = t.objectText(); } catch(e) { tEntry.text = ""; }
                try {
                  var tPos = t.position();
                  tEntry.position = { x: tPos[0], y: tPos[1] };
                } catch(e) { tEntry.position = null; }
                try { tEntry.width = t.width(); } catch(e) { tEntry.width = null; }
                try { tEntry.height = t.height(); } catch(e) { tEntry.height = null; }
                result.textItems.push(tEntry);
              }
            } catch(e) {
              result.textItems = [];
            }

            // Images
            try {
              var images = slide.images();
              for (var ii = 0; ii < images.length; ii++) {
                var img = images[ii];
                var iEntry = { index: ii + 1, fileName: "", position: null, width: null, height: null };
                try { iEntry.fileName = img.fileName(); } catch(e) { iEntry.fileName = ""; }
                try {
                  var iPos = img.position();
                  iEntry.position = { x: iPos[0], y: iPos[1] };
                } catch(e) { iEntry.position = null; }
                try { iEntry.width = img.width(); } catch(e) { iEntry.width = null; }
                try { iEntry.height = img.height(); } catch(e) { iEntry.height = null; }
                result.images.push(iEntry);
              }
            } catch(e) {
              result.images = [];
            }

            // Shapes
            try {
              var shapes = slide.shapes();
              for (var si = 0; si < shapes.length; si++) {
                var shp = shapes[si];
                var sEntry = { index: si + 1, position: null, width: null, height: null };
                try {
                  var sPos = shp.position();
                  sEntry.position = { x: sPos[0], y: sPos[1] };
                } catch(e) { sEntry.position = null; }
                try { sEntry.width = shp.width(); } catch(e) { sEntry.width = null; }
                try { sEntry.height = shp.height(); } catch(e) { sEntry.height = null; }
                result.shapes.push(sEntry);
              }
            } catch(e) {
              result.shapes = [];
            }

            // Tables
            try {
              var tables = slide.tables();
              for (var tbi = 0; tbi < tables.length; tbi++) {
                var tbl = tables[tbi];
                var tbEntry = { index: tbi + 1, rowCount: null, columnCount: null };
                try { tbEntry.rowCount = tbl.rowCount(); } catch(e) { tbEntry.rowCount = null; }
                try { tbEntry.columnCount = tbl.columnCount(); } catch(e) { tbEntry.columnCount = null; }
                result.tables.push(tbEntry);
              }
            } catch(e) {
              result.tables = [];
            }

            // Presenter notes
            try {
              result.presenterNotes = slide.presenterNotes();
            } catch(e) {
              result.presenterNotes = "";
            }

            JSON.stringify(result);
          }
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
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ── get_full_presentation_content ──────────────────────────────────
  server.tool(
    "get_full_presentation_content",
    "Returns a structured summary of the entire presentation including name, slide count, theme, and per-slide summaries with titles, body text, item counts, and presenter notes.",
    {},
    async () => {
      try {
        const script = `
          var app = Application("Keynote");
          var doc = app.documents[0];
          var result = {
            success: true,
            name: "",
            slideCount: 0,
            theme: "",
            slides: []
          };

          try { result.name = doc.name(); } catch(e) { result.name = ""; }
          try { result.theme = doc.documentTheme().name(); } catch(e) { result.theme = ""; }

          var slides = doc.slides();
          result.slideCount = slides.length;

          for (var i = 0; i < slides.length; i++) {
            var slide = slides[i];
            var entry = {
              index: i + 1,
              title: null,
              body: null,
              textItemCount: 0,
              imageCount: 0,
              shapeCount: 0,
              tableCount: 0,
              presenterNotes: ""
            };

            // Title
            try {
              entry.title = slide.defaultTitleItem().objectText();
            } catch(e) {
              entry.title = null;
            }

            // Body
            try {
              entry.body = slide.defaultBodyItem().objectText();
            } catch(e) {
              entry.body = null;
            }

            // Counts — use length of the element arrays
            try { entry.textItemCount = slide.textItems().length; } catch(e) { entry.textItemCount = 0; }
            try { entry.imageCount = slide.images().length; } catch(e) { entry.imageCount = 0; }
            try { entry.shapeCount = slide.shapes().length; } catch(e) { entry.shapeCount = 0; }
            try { entry.tableCount = slide.tables().length; } catch(e) { entry.tableCount = 0; }

            // Presenter notes
            try {
              entry.presenterNotes = slide.presenterNotes();
            } catch(e) {
              entry.presenterNotes = "";
            }

            result.slides.push(entry);
          }

          JSON.stringify(result);
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
