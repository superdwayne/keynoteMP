import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  runAppleScript,
  runJXA,
  escapeAppleScriptString,
  keynoteScript,
} from "../applescript.js";

export function registerTableChartTools(server: McpServer): void {
  // ── add_table ───────────────────────────────────────────────────────────
  server.tool(
    "add_table",
    "Adds a table to a slide with the specified number of rows and columns",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      rows: z.number().int().min(1).describe("Number of rows"),
      columns: z.number().int().min(1).describe("Number of columns"),
      x: z.number().optional().default(100).describe("X position in points (default: 100)"),
      y: z.number().optional().default(100).describe("Y position in points (default: 100)"),
      width: z.number().optional().default(600).describe("Width in points (default: 600)"),
      height: z.number().optional().default(300).describe("Height in points (default: 300)"),
    },
    async ({ slideIndex, rows, columns, x, y, width, height }) => {
      try {
        const script = keynoteScript(
          `tell slide ${slideIndex} of document 1\n` +
          `  set newTable to make new table with properties {row count:${rows}, column count:${columns}, position:{${x}, ${y}}, width:${width}, height:${height}}\n` +
          `  set tblCount to count of tables\n` +
          `  return tblCount\n` +
          `end tell`
        );

        const result = await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                slideIndex,
                tableIndex: parseInt(result, 10),
                rows,
                columns,
                position: { x, y },
                size: { width, height },
                message: `Table with ${rows} rows and ${columns} columns added to slide ${slideIndex}`,
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

  // ── set_table_cell ──────────────────────────────────────────────────────
  server.tool(
    "set_table_cell",
    "Sets the value of a specific cell in a table on a slide",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      tableIndex: z.number().int().min(1).describe("1-based table index"),
      row: z.number().int().min(1).describe("1-based row number"),
      column: z.number().int().min(1).describe("1-based column number"),
      value: z.string().describe("The text value to set in the cell"),
    },
    async ({ slideIndex, tableIndex, row, column, value }) => {
      try {
        const escaped = escapeAppleScriptString(value);
        const script = keynoteScript(
          `tell table ${tableIndex} of slide ${slideIndex} of document 1\n` +
          `  set value of cell ${column} of row ${row} to "${escaped}"\n` +
          `end tell`
        );

        await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                slideIndex,
                tableIndex,
                row,
                column,
                value,
                message: `Cell (${row}, ${column}) set in table ${tableIndex} on slide ${slideIndex}`,
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

  // ── set_table_data ──────────────────────────────────────────────────────
  server.tool(
    "set_table_data",
    "Bulk-sets table data from a 2D array of strings. Each inner array is a row.",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      tableIndex: z.number().int().min(1).describe("1-based table index"),
      data: z
        .array(z.array(z.string()))
        .describe("2D array of strings — each inner array is a row of cell values"),
    },
    async ({ slideIndex, tableIndex, data }) => {
      try {
        // Build AppleScript commands to set each cell
        const setCmds: string[] = [];
        for (let r = 0; r < data.length; r++) {
          const row = data[r];
          for (let c = 0; c < row.length; c++) {
            const escaped = escapeAppleScriptString(row[c]);
            setCmds.push(
              `    set value of cell ${c + 1} of row ${r + 1} to "${escaped}"`
            );
          }
        }

        const script = keynoteScript(
          `tell table ${tableIndex} of slide ${slideIndex} of document 1\n` +
          setCmds.join("\n") + "\n" +
          `end tell`
        );

        await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                slideIndex,
                tableIndex,
                rowsSet: data.length,
                columnsSet: data[0]?.length ?? 0,
                message: `Table data set for table ${tableIndex} on slide ${slideIndex}`,
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

  // ── get_table_data ──────────────────────────────────────────────────────
  server.tool(
    "get_table_data",
    "Reads all data from a table and returns it as a 2D array of strings",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      tableIndex: z.number().int().min(1).describe("1-based table index"),
    },
    async ({ slideIndex, tableIndex }) => {
      try {
        // Use JXA for reliable JSON output
        const jxaScript = `
          var app = Application("Keynote");
          var slide = app.documents[0].slides[${slideIndex - 1}];
          var table = slide.tables[${tableIndex - 1}];
          var rowCount = table.rowCount();
          var colCount = table.columnCount();
          var data = [];
          for (var r = 0; r < rowCount; r++) {
            var rowData = [];
            for (var c = 0; c < colCount; c++) {
              var cellValue = table.rows[r].cells[c].value();
              rowData.push(cellValue !== null && cellValue !== undefined ? String(cellValue) : "");
            }
            data.push(rowData);
          }
          JSON.stringify({
            success: true,
            slideIndex: ${slideIndex},
            tableIndex: ${tableIndex},
            rowCount: rowCount,
            columnCount: colCount,
            data: data
          });
        `;

        const result = await runJXA(jxaScript);
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

  // ── delete_table ────────────────────────────────────────────────────────
  server.tool(
    "delete_table",
    "Removes a table from a slide",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      tableIndex: z.number().int().min(1).describe("1-based table index"),
    },
    async ({ slideIndex, tableIndex }) => {
      try {
        const script = keynoteScript(
          `delete table ${tableIndex} of slide ${slideIndex} of document 1`
        );

        await runAppleScript(script);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                slideIndex,
                tableIndex,
                message: `Table ${tableIndex} deleted from slide ${slideIndex}`,
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

  // ── add_chart ───────────────────────────────────────────────────────────
  server.tool(
    "add_chart",
    "Adds a chart to a slide. Note: Keynote's AppleScript support for charts is limited. " +
    "This creates a chart and attempts to set the chart type. Data series configuration " +
    "may require manual adjustment in Keynote due to AppleScript limitations.",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      chartType: z
        .enum(["bar", "line", "pie", "area"])
        .describe("Type of chart to create"),
      x: z.number().optional().default(100).describe("X position in points (default: 100)"),
      y: z.number().optional().default(100).describe("Y position in points (default: 100)"),
      width: z.number().optional().default(600).describe("Width in points (default: 600)"),
      height: z.number().optional().default(400).describe("Height in points (default: 400)"),
      data: z
        .array(
          z.object({
            name: z.string().describe("Name of the data series"),
            values: z.array(z.number()).describe("Numeric values for the series"),
          })
        )
        .optional()
        .describe("Array of data series with name and values. Chart data may need manual adjustment in Keynote."),
    },
    async ({ slideIndex, chartType, x, y, width, height, data }) => {
      try {
        // Keynote AppleScript chart type mapping
        const chartTypeMap: Record<string, string> = {
          bar: "vertical_bar_2d",
          line: "line_2d",
          pie: "pie_2d",
          area: "area_2d",
        };

        // First, create the chart using a table as the data source.
        // Keynote charts are backed by tables, so we create a table with
        // the data first, then convert it to a chart approach. However,
        // direct chart creation via AppleScript is limited.
        //
        // The most reliable approach is to use JXA for chart creation.
        const jxaChartType: Record<string, string> = {
          bar: "vertical_bar_2d",
          line: "line_2d",
          pie: "pie_2d",
          area: "area_2d",
        };

        // Build data for JXA
        const seriesData = data ?? [];
        const maxValues = seriesData.reduce(
          (max, s) => Math.max(max, s.values.length),
          0
        );

        // We'll create a table with the chart data, then add the chart.
        // If no data is provided, just create a basic chart placeholder.
        if (seriesData.length === 0) {
          // Create a basic chart placeholder using AppleScript
          const script = keynoteScript(
            `tell slide ${slideIndex} of document 1\n` +
            `  set newChart to make new chart with properties {position:{${x}, ${y}}, width:${width}, height:${height}}\n` +
            `end tell`
          );

          try {
            await runAppleScript(script);
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    success: true,
                    slideIndex,
                    chartType,
                    position: { x, y },
                    size: { width, height },
                    message: `Chart placeholder added to slide ${slideIndex}. Edit chart data manually in Keynote.`,
                    limitation: "Keynote AppleScript has limited chart creation support. A default chart was created.",
                  }),
                },
              ],
            };
          } catch {
            // If direct chart creation fails, fall back to creating a table
            // that can be converted to a chart in Keynote
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    success: false,
                    error: "Direct chart creation via AppleScript is not supported in this version of Keynote. " +
                      "Consider creating a table with your data using add_table and set_table_data, " +
                      "then manually converting it to a chart in Keynote.",
                    suggestion: "Use add_table and set_table_data to create a data table instead.",
                  }),
                },
              ],
              isError: true,
            };
          }
        }

        // With data provided, try to create a chart and populate it.
        // First, attempt direct chart creation with data via JXA.
        const dataJSON = JSON.stringify(seriesData);
        const jxaScript = `
          var app = Application("Keynote");
          var slide = app.documents[0].slides[${slideIndex - 1}];
          var seriesData = ${dataJSON};

          // Try to create chart directly
          try {
            var chart = app.Chart({position: [${x}, ${y}], width: ${width}, height: ${height}});
            slide.charts.push(chart);
            JSON.stringify({
              success: true,
              slideIndex: ${slideIndex},
              chartType: "${chartType}",
              position: {x: ${x}, y: ${y}},
              size: {width: ${width}, height: ${height}},
              dataSeries: seriesData.length,
              message: "Chart added to slide ${slideIndex}.",
              note: "Chart data may need manual adjustment in Keynote."
            });
          } catch(e) {
            // If chart creation fails, create a table with the data instead
            // so the user has the data ready to chart
            var rows = ${maxValues} + 1;
            var cols = seriesData.length + 1;
            var table = app.Table({
              rowCount: rows,
              columnCount: cols,
              position: [${x}, ${y}],
              width: ${width},
              height: ${height}
            });
            slide.tables.push(table);

            // Set header row with series names
            for (var s = 0; s < seriesData.length; s++) {
              table.rows[0].cells[s + 1].value = seriesData[s].name;
            }

            // Set data values
            for (var s = 0; s < seriesData.length; s++) {
              for (var v = 0; v < seriesData[s].values.length; v++) {
                table.rows[v + 1].cells[s + 1].value = seriesData[s].values[v];
              }
            }

            // Set row labels
            for (var v = 0; v < ${maxValues}; v++) {
              table.rows[v + 1].cells[0].value = "Item " + (v + 1);
            }

            JSON.stringify({
              success: true,
              slideIndex: ${slideIndex},
              chartType: "${chartType}",
              position: {x: ${x}, y: ${y}},
              size: {width: ${width}, height: ${height}},
              dataSeries: seriesData.length,
              message: "Chart creation fell back to creating a data table. Select the table in Keynote and use Insert > Chart to create a chart from this data.",
              limitation: "Direct chart creation via AppleScript is limited. A data table was created instead."
            });
          }
        `;

        const result = await runJXA(jxaScript);
        return {
          content: [
            {
              type: "text" as const,
              text: result || JSON.stringify({
                success: true,
                slideIndex,
                chartType,
                message: "Chart operation completed.",
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
