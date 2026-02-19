# Keynote MCP Server

A Model Context Protocol (MCP) server that provides full programmatic control over Apple Keynote through AppleScript and JXA (JavaScript for Automation). Designed for use with Claude Desktop and any MCP-compatible client, this server lets you create, edit, present, and export Keynote presentations entirely through natural language.

## Prerequisites

- **macOS** (any recent version with Keynote installed)
- **Apple Keynote** (free from the Mac App Store)
- **Node.js 18+** (check with `node --version`)
- **Accessibility permissions** -- your terminal or IDE must be allowed to control Keynote via System Settings > Privacy & Security > Accessibility

## Installation

```bash
git clone <repository-url> keynote-mcp-server
cd keynote-mcp-server
npm install
npm run build
```

Verify the build succeeds and types pass:

```bash
npx tsc --noEmit
```

## Claude Desktop Configuration

Add the following entry to your `claude_desktop_config.json` (typically located at `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "keynote": {
      "command": "node",
      "args": ["/absolute/path/to/keynote-mcp-server/dist/index.js"]
    }
  }
}
```

Replace `/absolute/path/to/keynote-mcp-server` with the actual path on your machine. Restart Claude Desktop after saving the configuration.

## Tool Reference

The server registers **62 tools** across 12 modules. All slide indices are **1-based**.

### Presentation Management (6 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `create_presentation` | `themeName?` (string) | Creates a new blank Keynote presentation, optionally with a named theme |
| `open_presentation` | `filePath` (string) | Opens an existing `.key` file by absolute path |
| `save_presentation` | `filePath?` (string) | Saves the frontmost presentation; provide a path for save-as |
| `close_presentation` | `saving?` (boolean, default: true) | Closes the frontmost presentation |
| `list_presentations` | -- | Lists all open presentations with names and file paths |
| `get_presentation_info` | `name?` (string) | Returns slide count, theme, dimensions, and path for a presentation |

### Slide Management (7 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `add_slide` | `position?` (int), `masterSlideName?` (string) | Adds a new slide at a given position with an optional layout |
| `delete_slide` | `slideIndex` (int) | Removes a slide by index |
| `duplicate_slide` | `slideIndex` (int) | Duplicates a slide at the given index |
| `move_slide` | `fromIndex` (int), `toIndex` (int) | Moves a slide from one position to another |
| `get_slide_count` | -- | Returns total number of slides |
| `list_slides` | -- | Returns all slides with index, title, and layout name |
| `get_slide_layout_names` | -- | Lists available master slide / layout names for the current theme |

### Text Content (7 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `set_slide_title` | `slideIndex` (int), `text` (string) | Sets the title text of a slide |
| `set_slide_body` | `slideIndex` (int), `text` (string) | Sets the body text of a slide |
| `add_text_item` | `slideIndex` (int), `text` (string), `x`, `y`, `width`, `height` (numbers) | Adds a new text box at a given position and size |
| `update_text_item` | `slideIndex` (int), `itemIndex` (int), `text` (string) | Updates text content of an existing text item |
| `delete_text_item` | `slideIndex` (int), `itemIndex` (int) | Removes a text item from a slide |
| `list_text_items` | `slideIndex` (int) | Lists all text items on a slide with content, position, and size |
| `format_text` | `slideIndex` (int), `itemIndex` (int), `fontName?`, `fontSize?`, `bold?`, `italic?`, `color?` (hex), `alignment?` (left/center/right) | Applies formatting to a text item |

### Images & Media (5 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `add_image` | `slideIndex` (int), `filePath` (string), `x?`, `y?`, `width?`, `height?` (numbers) | Adds an image file to a slide |
| `replace_image` | `slideIndex` (int), `imageIndex` (int), `filePath` (string) | Replaces an existing image with a new file |
| `delete_image` | `slideIndex` (int), `imageIndex` (int) | Removes an image from a slide |
| `list_images` | `slideIndex` (int) | Lists all images on a slide with positions and file names |
| `set_image_position` | `slideIndex` (int), `imageIndex` (int), `x?`, `y?`, `width?`, `height?` (numbers) | Repositions or resizes an existing image |

### Presenter Notes (3 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `set_presenter_notes` | `slideIndex` (int), `notes` (string) | Sets presenter notes for a slide |
| `get_presenter_notes` | `slideIndex` (int) | Retrieves presenter notes for a slide |
| `get_all_presenter_notes` | -- | Returns all slides' presenter notes as an array |

### Themes & Styling (6 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `list_themes` | -- | Lists available Keynote themes (queries Keynote or falls back to a built-in list) |
| `apply_theme` | `themeName` (string) | Applies a theme to the frontmost presentation |
| `set_slide_background_color` | `slideIndex` (int), `color` (hex string) | Sets a solid background color on a slide |
| `set_slide_background_image` | `slideIndex` (int), `filePath` (string) | Sets an image as the slide background |
| `get_slide_master` | `slideIndex` (int) | Returns the master slide / layout name for a slide |
| `change_slide_master` | `slideIndex` (int), `masterName` (string) | Changes a slide's master layout |

### Transitions & Animations (6 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `set_slide_transition` | `slideIndex` (int), `effect` (string), `duration?` (number, default: 1.0) | Sets a transition effect on a slide |
| `get_slide_transition` | `slideIndex` (int) | Returns current transition settings for a slide |
| `list_transition_types` | -- | Lists all 33 available transition effect names |
| `add_build_animation` | `slideIndex` (int), `itemIndex` (int), `type` (appear/dissolve/scale/move_in/fly_in/fade_and_move), `buildType` (in/out), `duration?` (number) | Adds a build-in or build-out animation to an item |
| `remove_build_animation` | `slideIndex` (int), `itemIndex` (int), `buildType` (in/out) | Removes an animation from an item |
| `list_build_animations` | `slideIndex` (int) | Lists all build animations for every item on a slide |

### Tables & Charts (6 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `add_table` | `slideIndex` (int), `rows` (int), `columns` (int), `x?`, `y?`, `width?`, `height?` (numbers) | Adds a table to a slide |
| `set_table_cell` | `slideIndex` (int), `tableIndex` (int), `row` (int), `column` (int), `value` (string) | Sets the value of a specific table cell |
| `set_table_data` | `slideIndex` (int), `tableIndex` (int), `data` (string[][]) | Bulk-sets table data from a 2D array |
| `get_table_data` | `slideIndex` (int), `tableIndex` (int) | Reads all data from a table as a 2D array |
| `delete_table` | `slideIndex` (int), `tableIndex` (int) | Removes a table from a slide |
| `add_chart` | `slideIndex` (int), `chartType` (bar/line/pie/area), `x?`, `y?`, `width?`, `height?`, `data?` (series array) | Adds a chart to a slide (may fall back to a data table due to AppleScript limitations) |

### Live Slideshow Control (6 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `start_slideshow` | `fromSlide?` (int) | Starts the slideshow from the beginning or a specific slide |
| `stop_slideshow` | -- | Stops the currently running slideshow |
| `next_slide` | -- | Advances to the next slide or build |
| `previous_slide` | -- | Goes back to the previous slide or build |
| `go_to_slide` | `slideIndex` (int) | Jumps to a specific slide during the slideshow |
| `get_slideshow_status` | -- | Returns whether a slideshow is playing and the current slide number |

### Export (4 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `export_to_pdf` | `filePath` (string) | Exports the presentation as a PDF |
| `export_to_images` | `directoryPath` (string), `format?` (PNG/JPEG) | Exports all slides as individual image files to a directory |
| `export_to_pptx` | `filePath` (string) | Exports as Microsoft PowerPoint (.pptx) |
| `export_slide_to_image` | `slideIndex` (int), `filePath` (string), `format?` (PNG/JPEG) | Exports a single slide as an image file |

### Content Extraction (2 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `get_slide_content` | `slideIndex` (int) | Returns all content on a slide: title, body, text items, images, shapes, tables, and notes |
| `get_full_presentation_content` | -- | Returns a structured summary of the entire presentation with per-slide details |

### Shapes & Drawing (4 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `add_shape` | `slideIndex` (int), `shapeType` (rectangle/circle/triangle/arrow_right/arrow_left/star/diamond/line), `x`, `y`, `width`, `height` (numbers), `fillColor?` (hex) | Adds a shape to a slide |
| `delete_shape` | `slideIndex` (int), `shapeIndex` (int) | Removes a shape from a slide |
| `list_shapes` | `slideIndex` (int) | Lists all shapes on a slide with position and size |
| `update_shape` | `slideIndex` (int), `shapeIndex` (int), `x?`, `y?`, `width?`, `height?`, `fillColor?`, `borderColor?`, `borderWidth?` | Modifies a shape's position, size, or styling |

## Usage Examples

### Create a presentation from scratch

```
"Create a new Keynote presentation with the Gradient theme, add 5 slides, and set titles for each one."
```

Claude will call `create_presentation` with `themeName: "Gradient"`, then `add_slide` five times, and `set_slide_title` for each slide.

### Build a data-driven slide

```
"On slide 3, add a table with quarterly revenue data: Q1: $1.2M, Q2: $1.5M, Q3: $1.8M, Q4: $2.1M."
```

Claude will use `add_table`, then `set_table_data` to populate the cells.

### Export for sharing

```
"Export my presentation as a PDF to the Desktop and also save each slide as a PNG image."
```

Claude will call `export_to_pdf` and `export_to_images` with the appropriate paths.

### Control a live presentation

```
"Start the slideshow from slide 1, then advance two slides."
```

Claude will call `start_slideshow`, then `next_slide` twice.

### Extract content for review

```
"Read the full content of my open presentation so we can discuss improvements."
```

Claude will call `get_full_presentation_content` to retrieve a structured summary of every slide.

## Architecture

```
keynote-mcp-server/
  src/
    index.ts              # Entry point -- creates MCP server, registers all tool modules
    applescript.ts        # AppleScript/JXA execution bridge (runAppleScript, runJXA)
    tools/
      presentation.ts     # create, open, save, close, list, info
      slides.ts           # add, delete, duplicate, move, count, list, layouts
      text.ts             # title, body, text items, formatting
      images.ts           # add, replace, delete, list, reposition images
      notes.ts            # set, get, get-all presenter notes
      theme.ts            # themes, backgrounds, master slides
      transitions.ts      # slide transitions, build animations
      tables-charts.ts    # tables (CRUD + bulk data), charts
      slideshow.ts        # start, stop, next, previous, go-to, status
      export.ts           # PDF, images, PowerPoint, single-slide export
      content.ts          # read slide content, full presentation summary
      shapes.ts           # add, delete, list, update shapes
  dist/                   # Compiled JavaScript output (generated by `npm run build`)
  package.json
  tsconfig.json
```

The server uses **stdio transport** (standard for local MCP servers). Each tool module exports a `register*Tools(server)` function that registers tools with the MCP server instance. All Keynote automation is performed by shelling out to `osascript` via `child_process.execFile`, using either AppleScript or JXA depending on the operation.

## Troubleshooting

### "AppleScript error: Not authorized to send Apple events"

Your terminal or IDE needs Accessibility permissions. Go to **System Settings > Privacy & Security > Accessibility** and add your terminal application (Terminal.app, iTerm2, VS Code, etc.).

You may also need to grant permissions under **Privacy & Security > Automation** to allow your terminal to control Keynote.

### "Keynote got an error: Can't get document 1"

No Keynote presentation is currently open. Use `create_presentation` or `open_presentation` first.

### Build errors

Make sure you have Node.js 18+ installed and run `npm install` before `npm run build`. The project requires TypeScript and the MCP SDK as dependencies.

### Keynote must be installed

This server controls Keynote.app via AppleScript. It will not work without Keynote installed. Keynote is free from the Mac App Store.

### Chart creation limitations

Direct chart creation via AppleScript is limited in some Keynote versions. The `add_chart` tool will attempt to create a chart directly but may fall back to creating a data table with your values. You can then manually convert that table to a chart in Keynote.

### Timeout errors

Each AppleScript command has a 30-second timeout. Operations on very large presentations or complex exports may occasionally time out. If this happens, try the operation again or work with fewer slides at a time.

## License

MIT
