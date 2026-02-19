# PRD: Keynote Slide Design Engine

## Introduction

The Keynote MCP server currently has 62 low-level tools that create slides with manual x/y positioning, hardcoded font sizes, and no design intelligence. The result is basic, ugly slides that look like they were laid out by hand with a ruler.

This PRD introduces a **Design Engine** — a flexible grid/constraint system with color theory, typography hierarchy, and automatic visual balance that generates unlimited professional layout variations. It extracts style from the active Keynote theme by default, with brand override support. Existing tools are upgraded to be design-aware, and new high-level composition tools orchestrate the primitives into polished slides.

## Goals

- Provide a flexible grid/constraint layout system that calculates element positions automatically
- Implement a professional typography hierarchy (display, heading, subheading, body, caption, overline) with proper scale ratios
- Build a color engine with palette generation, complementary/analogous/triadic harmony, contrast checking (WCAG), and automatic accent selection
- Support theme-aware defaults (extract colors, fonts from active Keynote theme) with brand config override
- Create high-level `design_slide` and `design_deck` tools that produce polished slides in a single call
- Upgrade existing text, shape, and image tools with optional design-aware positioning and styling
- Manage whitespace, visual weight distribution, and element spacing automatically
- Enable unlimited layout variations through constraint-based composition rather than fixed templates

## User Stories

### US-001: Design Tokens Foundation
**Description:** As a developer, I need a design token system that defines the fundamental constants for the layout engine — slide dimensions, spacing scale, margin safe zones, and element sizing rules.

**Acceptance Criteria:**
- [ ] Create `src/design/tokens.ts` with exported token objects
- [ ] Define slide canvas: 1024x768 (standard) and 1920x1080 (widescreen) presets
- [ ] Define 8-point spacing scale: `xs=8, sm=16, md=24, lg=32, xl=48, xxl=64, xxxl=96`
- [ ] Define safe margins: `top=60, bottom=60, left=80, right=80` (configurable)
- [ ] Define content zones: usable width/height after margins
- [ ] Export `DesignTokens` interface and `defaultTokens` / `widescreenTokens` constants
- [ ] All values in Keynote points (1pt = 1px at 72dpi)
- [ ] Typecheck passes

### US-002: Typography System
**Description:** As a developer, I need a typography hierarchy system that maps semantic roles (display, h1, h2, body, caption) to concrete font properties, so the layout engine can apply consistent, professional text styling.

**Acceptance Criteria:**
- [ ] Create `src/design/typography.ts`
- [ ] Define `TypeRole` enum: `display`, `heading`, `subheading`, `body`, `bodySmall`, `caption`, `overline`, `quote`
- [ ] Define `TypeStyle` interface: `{ fontName, fontSize, fontWeight, lineHeight, letterSpacing, color?, alignment? }`
- [ ] Implement a modular type scale with ratio 1.25 (Major Third) — base size 18pt
- [ ] Provide default font stacks: `Helvetica Neue` primary, `Georgia` for quotes, `SF Mono` for code
- [ ] Export `getTypeStyle(role: TypeRole, overrides?: Partial<TypeStyle>): TypeStyle`
- [ ] Export `createTypeScale(baseFontSize: number, ratio?: number): Record<TypeRole, TypeStyle>`
- [ ] Typecheck passes

### US-003: Color Engine — Palette and Harmony
**Description:** As a developer, I need a color engine that generates harmonious palettes, checks contrast ratios, and provides automatic accent color selection for visually cohesive slides.

**Acceptance Criteria:**
- [ ] Create `src/design/color.ts`
- [ ] Implement hex-to-HSL and HSL-to-hex conversion utilities
- [ ] Implement `generatePalette(baseColor: string, harmony: 'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'monochromatic')` returning 5 colors
- [ ] Implement `getContrastRatio(color1: string, color2: string): number` per WCAG luminance formula
- [ ] Implement `ensureContrast(foreground: string, background: string, minRatio?: number): string` that adjusts foreground if needed
- [ ] Implement `autoAccent(baseColor: string): string` that picks a high-contrast accent
- [ ] Export `ColorPalette` interface: `{ primary, secondary, accent, background, surface, textPrimary, textSecondary, textOnPrimary }`
- [ ] Implement `createPalette(primary: string, options?: { dark?: boolean }): ColorPalette`
- [ ] Typecheck passes

### US-004: Grid System and Constraint Solver
**Description:** As a developer, I need a grid system that divides the slide canvas into columns and rows with gutters, and a constraint solver that positions elements within grid cells while respecting spacing rules.

**Acceptance Criteria:**
- [ ] Create `src/design/grid.ts`
- [ ] Define `GridConfig`: `{ columns, rows, gutter, margins }` with default 12-column grid
- [ ] Implement `createGrid(tokens: DesignTokens, config?: Partial<GridConfig>): Grid`
- [ ] `Grid` has method `getCell(colStart, colSpan, rowStart, rowSpan): Rect` returning `{x, y, width, height}` in points
- [ ] `Grid` has method `getCenterRect(width, height): Rect` for centered elements
- [ ] `Grid` has method `getContentArea(): Rect` returning the full usable area within margins
- [ ] Implement `alignElement(rect: Rect, container: Rect, alignment: 'start' | 'center' | 'end', axis: 'x' | 'y'): Rect`
- [ ] Implement `distributeElements(rects: Rect[], container: Rect, axis: 'x' | 'y', gap?: number): Rect[]` for even distribution
- [ ] Typecheck passes

### US-005: Layout Definition Schema
**Description:** As a developer, I need a layout definition schema that describes slide compositions declaratively — what elements go where in the grid, their roles, and their constraints — so layouts can be generated programmatically.

**Acceptance Criteria:**
- [ ] Create `src/design/layouts.ts`
- [ ] Define `LayoutElement` interface: `{ id, type: 'text' | 'image' | 'shape', role: TypeRole | 'hero-image' | 'accent-shape' | 'divider' | 'background-shape', gridArea: { colStart, colSpan, rowStart, rowSpan }, padding?, alignment? }`
- [ ] Define `LayoutDefinition` interface: `{ name, description, category: 'title' | 'content' | 'section' | 'comparison' | 'media' | 'data' | 'quote' | 'closing', elements: LayoutElement[], gridOverride?: Partial<GridConfig> }`
- [ ] Implement `resolveLayout(layout: LayoutDefinition, grid: Grid, tokens: DesignTokens): ResolvedElement[]` that converts grid areas to absolute positions
- [ ] `ResolvedElement` has `{ id, type, role, rect: Rect, padding }` with all positions in points
- [ ] Typecheck passes

### US-006: Core Layout Library — Title and Section Layouts
**Description:** As a designer, I want professional title slide and section break layouts so presentations open strong and have clear visual chapter breaks.

**Acceptance Criteria:**
- [ ] Add to `src/design/layout-library.ts`
- [ ] `title-center`: centered title (display type), subtitle below, optional accent line shape
- [ ] `title-left`: left-aligned title with right accent/image zone, subtitle below title
- [ ] `title-bold`: full-bleed background color, large centered display text, small subtitle
- [ ] `section-break`: large heading centered vertically, thin accent line, section number optional
- [ ] `section-gradient`: heading on gradient background with contrasting text
- [ ] Each layout defined as `LayoutDefinition` using grid coordinates
- [ ] Export as `const layoutLibrary: Record<string, LayoutDefinition>`
- [ ] Typecheck passes

### US-007: Core Layout Library — Content and Media Layouts
**Description:** As a designer, I want content-focused layouts for body text, bullet points, images, and two-column comparisons so presentations convey information clearly.

**Acceptance Criteria:**
- [ ] `content-left`: heading top-left, body text below spanning ~8 columns
- [ ] `content-right-image`: heading + body left (6 cols), image right (5 cols)
- [ ] `content-left-image`: image left (5 cols), heading + body right (6 cols)
- [ ] `two-column`: heading top spanning full width, two equal body columns below with gutter
- [ ] `three-column`: heading top, three equal columns below
- [ ] `full-image`: full-bleed image background with overlay text zone (bottom or top)
- [ ] `image-grid`: 2x2 or 1x3 image grid with optional caption per image
- [ ] Each layout defined as `LayoutDefinition` with proper grid areas
- [ ] Typecheck passes

### US-008: Core Layout Library — Quote, Data, and Closing Layouts
**Description:** As a designer, I want specialized layouts for quotes, data/statistics, and closing slides so the deck has variety and visual rhythm.

**Acceptance Criteria:**
- [ ] `quote`: large italic quote text centered, attribution below, oversized opening-quote accent shape
- [ ] `statistic`: 1-3 large numbers with labels, optional icon placeholders
- [ ] `comparison`: two-column with header labels, divider line between columns
- [ ] `closing-cta`: centered heading, subtitle, call-to-action text block, optional contact info zone
- [ ] `closing-thankyou`: large "Thank You" display text with subtle accent elements
- [ ] `blank-canvas`: empty layout with just margins defined, for free-form composition
- [ ] Each layout defined as `LayoutDefinition`
- [ ] Typecheck passes

### US-009: Brand Configuration System
**Description:** As a user, I want to provide brand colors, fonts, and style preferences so the design engine generates on-brand slides. When no brand config is provided, it should extract sensible defaults from the active Keynote theme.

**Acceptance Criteria:**
- [ ] Create `src/design/brand.ts`
- [ ] Define `BrandConfig` interface: `{ primaryColor, secondaryColor?, accentColor?, backgroundColor?, fontPrimary?, fontSecondary?, style?: 'minimal' | 'bold' | 'elegant' | 'playful' | 'corporate' }`
- [ ] Implement `extractThemeColors(slideIndex?: number): Promise<BrandConfig>` using JXA to read the active theme's color scheme and fonts
- [ ] Implement `resolveBrand(userConfig?: Partial<BrandConfig>): Promise<BrandConfig>` that merges user config over theme defaults
- [ ] Implement `brandToTokens(brand: BrandConfig): { palette: ColorPalette, typography: Record<TypeRole, TypeStyle> }` that maps brand to design system
- [ ] The `style` property adjusts spacing density, border radius, font weight preferences
- [ ] Typecheck passes

### US-010: Slide Composer — Core Engine
**Description:** As a developer, I need the core composer that takes a layout definition, brand config, and content, then executes the existing AppleScript/JXA functions (add text items, add shapes, set backgrounds, format text, add images) to build a complete slide.

**Acceptance Criteria:**
- [ ] Create `src/design/composer.ts`
- [ ] Implement `composeSlide(slideIndex: number, layout: LayoutDefinition, content: SlideContent, brand: BrandConfig): Promise<ComposeResult>`
- [ ] `SlideContent` interface: `{ title?, subtitle?, body?, bodyItems?: string[], quote?, attribution?, imagePaths?: string[], stats?: {value: string, label: string}[] }`
- [ ] Composer resolves layout to absolute positions via grid
- [ ] Composer creates text items at resolved positions with proper typography via JXA/AppleScript
- [ ] Composer creates accent shapes (lines, rectangles) with brand colors
- [ ] Composer sets background color based on layout category and brand
- [ ] Composer formats all text with the typography system
- [ ] Returns `ComposeResult` with list of created elements and their positions
- [ ] Typecheck passes

### US-011: Register `design_slide` MCP Tool
**Description:** As a user, I want a single `design_slide` tool that creates a professionally designed slide by specifying the layout name and content — no manual positioning needed.

**Acceptance Criteria:**
- [ ] Add `src/tools/design.ts` with `registerDesignTools(server: McpServer)`
- [ ] Register `design_slide` tool with params: `slideIndex, layout (string), content (SlideContent schema), brand? (Partial<BrandConfig>)`
- [ ] Tool resolves brand (user override or theme extraction)
- [ ] Tool calls composer to build the slide
- [ ] Tool returns created elements summary with positions
- [ ] Register tool in `src/index.ts`
- [ ] Error handling with `isError: true` on failure
- [ ] Typecheck passes

### US-012: Register `set_brand` and `get_brand` MCP Tools
**Description:** As a user, I want to set brand configuration once per session so all subsequent design operations use consistent styling without repeating brand params.

**Acceptance Criteria:**
- [ ] Add `set_brand` tool: accepts `BrandConfig` params, stores in module-level state
- [ ] Add `get_brand` tool: returns current brand config (user-set or extracted from theme)
- [ ] Add `list_layouts` tool: returns available layout names with descriptions and categories
- [ ] Brand state persists across tool calls within the same MCP session
- [ ] `design_slide` uses stored brand when no override provided
- [ ] Error handling on all tools
- [ ] Typecheck passes

### US-013: Register `design_deck` MCP Tool
**Description:** As a user, I want a `design_deck` tool that creates an entire multi-slide presentation from a structured outline, automatically selecting varied layouts and maintaining visual coherence across all slides.

**Acceptance Criteria:**
- [ ] Register `design_deck` tool with params: `slides: Array<{ layout?, content: SlideContent }>, brand?, theme?`
- [ ] When layout is omitted, auto-select based on content shape (has image -> media layout, has stats -> data layout, first slide -> title layout, last slide -> closing layout)
- [ ] Vary layouts to avoid repetition (don't use same layout consecutively)
- [ ] Apply consistent brand/palette across all slides
- [ ] Apply transitions between slides (default subtle transitions)
- [ ] Return summary of all created slides with their layouts
- [ ] Typecheck passes

### US-014: Whitespace and Visual Balance Utilities
**Description:** As a developer, I need whitespace management utilities that ensure elements don't crowd each other, maintain breathing room, and create visual balance on each slide.

**Acceptance Criteria:**
- [ ] Create `src/design/balance.ts`
- [ ] Implement `addPadding(rect: Rect, padding: number | {top, right, bottom, left}): Rect`
- [ ] Implement `ensureMinSpacing(elements: Rect[], minGap: number): Rect[]` that nudges overlapping elements apart
- [ ] Implement `calculateVisualWeight(element: ResolvedElement): number` based on size, type, and color darkness
- [ ] Implement `balanceComposition(elements: ResolvedElement[]): ResolvedElement[]` that adjusts positions to balance visual weight across the slide (left-right, top-bottom)
- [ ] Composer uses these utilities before finalizing element positions
- [ ] Typecheck passes

### US-015: Accent Shape and Decoration Generation
**Description:** As a designer, I want the design engine to automatically add decorative accent elements — divider lines, background rectangles, gradient overlays, corner accents — based on the layout and brand style.

**Acceptance Criteria:**
- [ ] Create `src/design/accents.ts`
- [ ] Implement `generateAccents(layout: LayoutDefinition, brand: BrandConfig, style: string): AccentElement[]`
- [ ] `AccentElement` has `{ type: 'line' | 'rectangle' | 'circle', rect: Rect, color: string, opacity?: number }`
- [ ] Style `minimal`: thin lines, subtle borders
- [ ] Style `bold`: thick color blocks, large shapes
- [ ] Style `elegant`: thin gold/silver lines, serif typography cue
- [ ] Style `corporate`: clean lines, structured grids
- [ ] Style `playful`: rounded shapes, bright accent pops
- [ ] Composer integrates accents into slide building
- [ ] Typecheck passes

### US-016: Design-Aware `add_text_item` Upgrade
**Description:** As a user, I want the existing `add_text_item` tool to optionally accept a `role` parameter (heading, body, caption, etc.) that automatically applies the correct typography styling from the design system, so I don't have to manually specify font, size, and color.

**Acceptance Criteria:**
- [ ] Add optional `role` parameter (TypeRole enum values) to `add_text_item`
- [ ] Add optional `autoPosition` parameter: `'top-left' | 'top-center' | 'center' | 'bottom-left' | 'bottom-center'`
- [ ] When `role` is provided, apply matching `TypeStyle` (font, size, bold/italic, color, alignment)
- [ ] When `autoPosition` is provided, calculate x/y from grid system instead of requiring manual coords
- [ ] Manual x/y/width/height still work and override auto-positioning
- [ ] Existing behavior unchanged when new params are omitted
- [ ] Typecheck passes

### US-017: Design-Aware `add_shape` Upgrade
**Description:** As a user, I want the existing `add_shape` tool to optionally accept a `role` parameter (accent, divider, background-panel, highlight) that automatically applies brand-appropriate colors and sizing.

**Acceptance Criteria:**
- [ ] Add optional `role` parameter to `add_shape`: `'accent' | 'divider' | 'background-panel' | 'highlight' | 'decorative'`
- [ ] When role is `accent`: use brand accent color, sized proportionally to slide
- [ ] When role is `divider`: create thin line (2pt) in secondary color, full-width or specified width
- [ ] When role is `background-panel`: semi-transparent rectangle for text overlay zones
- [ ] When role is `highlight`: bright accent behind key content
- [ ] Existing manual behavior unchanged when role is omitted
- [ ] Typecheck passes

### US-018: Design-Aware `add_image` Upgrade
**Description:** As a user, I want the existing `add_image` tool to optionally accept positioning hints like `'hero'`, `'thumbnail'`, `'background'` that automatically size and position images according to design rules.

**Acceptance Criteria:**
- [ ] Add optional `role` parameter to `add_image`: `'hero' | 'thumbnail' | 'inline' | 'background' | 'avatar'`
- [ ] `hero`: fills right or left half of slide, maintains aspect ratio
- [ ] `thumbnail`: small fixed size (200x150), positioned in grid
- [ ] `background`: full slide coverage
- [ ] `avatar`: circular crop area, small (80x80)
- [ ] `inline`: fits within content column width
- [ ] Existing manual x/y/width/height override auto-sizing
- [ ] Typecheck passes

### US-019: Layout Variation Engine
**Description:** As a developer, I need the ability to generate layout variations from a base layout — shifting alignments, swapping image sides, adjusting proportions — so the deck doesn't feel repetitive.

**Acceptance Criteria:**
- [ ] Create `src/design/variations.ts`
- [ ] Implement `generateVariation(baseLayout: LayoutDefinition, seed?: number): LayoutDefinition`
- [ ] Variations include: mirror (left-right swap), proportion shift (60/40 to 50/50 to 70/30), alignment changes (left to center)
- [ ] Implement `selectLayout(content: SlideContent, previousLayouts: string[], category?: string): LayoutDefinition` that picks the best layout for content while avoiding repeats
- [ ] `design_deck` uses `selectLayout` for auto-layout selection
- [ ] Typecheck passes

### US-020: Build Integration and Final Verification
**Description:** As a developer, I need to verify the complete design engine builds, all modules are wired correctly, and the new tools are registered in the MCP server.

**Acceptance Criteria:**
- [ ] All new files import/export correctly with `.js` extensions
- [ ] `src/index.ts` imports and calls `registerDesignTools(server)`
- [ ] `npm run build` succeeds with zero errors
- [ ] `npm run typecheck` succeeds with zero errors
- [ ] All 12 existing tool modules still register correctly
- [ ] New design tools appear in MCP tool listing
- [ ] Typecheck passes

## Non-Goals

- **No image generation**: The design engine positions and sizes images but does not create/generate images. Users must provide image file paths.
- **No animation/transition design**: Transitions are handled by the existing `transitions.ts` module. The design engine may apply default transitions in `design_deck` but does not design custom animations.
- **No PDF/export design**: Export remains handled by `export.ts`.
- **No real-time preview**: The engine computes and applies — there is no interactive preview loop.
- **No Keynote plugin/extension**: This remains a pure MCP server using AppleScript/JXA.
- **No template file import**: Layouts are defined in code, not imported from `.kth` template files.
- **No icon/illustration library**: The engine places shapes and images but does not include an icon set.

## Technical Considerations

### File Structure
```
src/design/
  tokens.ts         — spacing, dimensions, margins
  typography.ts     — type scale, font stacks, roles
  color.ts          — palette, harmony, contrast
  grid.ts           — grid system, constraint solver, spacing utilities
  layouts.ts        — layout schema + resolver
  layout-library.ts — all layout definitions (title, content, media, quote, data, closing)
  variations.ts     — layout variation + auto-selection
  brand.ts          — brand config, theme extraction
  accents.ts        — decorative element generation
  composer.ts       — orchestrates layout into tool calls
  balance.ts        — whitespace, visual weight
src/tools/
  design.ts         — MCP tool registrations (design_slide, design_deck, set_brand, etc.)
```

### Key Constraints
- All positioning in Keynote points (1pt = 1px at 72dpi)
- Keynote standard slide: 1024x768, widescreen: 1920x1080
- Keynote RGB: 0-65535 per channel (multiply 0-255 by 257)
- AppleScript 1-based indexing, JXA 0-based
- The composer calls AppleScript/JXA functions directly (not via MCP protocol) for performance
- Design modules are pure TypeScript (no AppleScript) except `brand.ts` which reads theme via JXA

### Existing Tools to Upgrade (Backward-Compatible)
- `add_text_item` (text.ts) — add optional `role`, `autoPosition` params
- `add_shape` (shapes.ts) — add optional `role` param
- `add_image` (images.ts) — add optional `role` param

### Dependencies
- No new npm packages required — all algorithms implemented in pure TypeScript
- Color math (HSL conversion, luminance) is straightforward to implement
- Grid calculations are pure arithmetic
