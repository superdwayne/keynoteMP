#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerPresentationTools } from "./tools/presentation.js";
import { registerSlideTools } from "./tools/slides.js";
import { registerTextTools } from "./tools/text.js";
import { registerImageTools } from "./tools/images.js";
import { registerNotesTools } from "./tools/notes.js";
import { registerThemeTools } from "./tools/theme.js";
import { registerTransitionTools } from "./tools/transitions.js";
import { registerTableChartTools } from "./tools/tables-charts.js";
import { registerSlideshowTools } from "./tools/slideshow.js";
import { registerExportTools } from "./tools/export.js";
import { registerContentTools } from "./tools/content.js";
import { registerShapeTools } from "./tools/shapes.js";
import { registerDesignTools } from "./tools/design.js";

const server = new McpServer({
  name: "keynote-mcp-server",
  version: "1.0.0",
});

registerPresentationTools(server);
registerSlideTools(server);
registerTextTools(server);
registerImageTools(server);
registerNotesTools(server);
registerThemeTools(server);
registerTransitionTools(server);
registerTableChartTools(server);
registerSlideshowTools(server);
registerExportTools(server);
registerContentTools(server);
registerShapeTools(server);
registerDesignTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
