import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  runAppleScript,
  runJXA,
  escapeAppleScriptString,
  keynoteScript,
} from "../applescript.js";

/**
 * Map of user-friendly transition names to Keynote AppleScript enum identifiers.
 * Keynote's transition effect enum uses specific constants.
 */
const TRANSITION_EFFECTS: Record<string, string> = {
  "none": "no transition effect",
  "magic move": "magic move",
  "shimmer": "shimmer",
  "sparkle": "sparkle",
  "swing": "swing",
  "dissolve": "dissolve",
  "cube": "cube",
  "flip": "flip",
  "mosaic": "mosaic",
  "push": "push",
  "reveal": "reveal",
  "switch": "switch",
  "wipe": "wipe",
  "blinds": "blinds",
  "color planes": "color planes",
  "confetti": "confetti",
  "doorway": "doorway",
  "drop": "drop",
  "fall": "fall",
  "flop": "flop",
  "iris": "iris",
  "move in": "move in",
  "object cube": "object cube",
  "object flip": "object flip",
  "object pop": "object pop",
  "object push": "object push",
  "object revolve": "object revolve",
  "object zoom": "object zoom",
  "perspective": "perspective",
  "revolving door": "revolving door",
  "scale": "scale",
  "swoosh": "swoosh",
  "twirl": "twirl",
  "twist": "twist",
};

/**
 * Map of user-friendly build animation names to Keynote AppleScript enum identifiers.
 */
const BUILD_EFFECTS: Record<string, string> = {
  "appear": "appear",
  "dissolve": "dissolve",
  "scale": "scale",
  "move_in": "move in",
  "fly_in": "fly in",
  "fade_and_move": "fade and move",
};

export function registerTransitionTools(server: McpServer): void {
  // ── set_slide_transition ────────────────────────────────────────────
  server.tool(
    "set_slide_transition",
    "Sets the transition effect for a slide. Common effects: 'none', 'magic move', 'dissolve', 'push', 'reveal', 'cube', 'flip', 'wipe', 'shimmer', 'sparkle'. Use list_transition_types to see all available effects.",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      effect: z
        .string()
        .describe("Transition effect name (e.g. 'dissolve', 'magic move', 'push', 'none')"),
      duration: z
        .number()
        .min(0)
        .optional()
        .default(1.0)
        .describe("Transition duration in seconds (default: 1.0)"),
    },
    async ({ slideIndex, effect, duration }) => {
      try {
        const effectLower = effect.toLowerCase().trim();
        const keynoteEffect = TRANSITION_EFFECTS[effectLower];

        if (!keynoteEffect) {
          const available = Object.keys(TRANSITION_EFFECTS).join(", ");
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  error: `Unknown transition effect "${effect}". Available effects: ${available}`,
                }),
              },
            ],
            isError: true,
          };
        }

        const script = keynoteScript(
          `  tell slide ${slideIndex} of front document
    set transition properties to {transition effect:${keynoteEffect}, transition duration:${duration}}
  end tell
  return "done"`
        );
        await runAppleScript(script);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                slideIndex,
                effect: effectLower,
                duration,
                message: `Transition "${effectLower}" set on slide ${slideIndex} with duration ${duration}s`,
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

  // ── get_slide_transition ────────────────────────────────────────────
  server.tool(
    "get_slide_transition",
    "Gets the current transition effect, duration, and delay for a slide.",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
    },
    async ({ slideIndex }) => {
      try {
        // Use JXA for cleaner property extraction
        const script = `
          var app = Application("Keynote");
          var slide = app.documents[0].slides[${slideIndex - 1}];
          var props = slide.transitionProperties();
          JSON.stringify({
            success: true,
            slideIndex: ${slideIndex},
            transition: {
              effect: props.transitionEffect || "none",
              duration: props.transitionDuration || 0,
              delay: props.transitionDelay || 0
            }
          });
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
      } catch (jxaError) {
        // Fallback to AppleScript
        try {
          const script = keynoteScript(
            `  set transProps to transition properties of slide ${slideIndex} of front document
  set transEffect to transition effect of transProps
  set transDuration to transition duration of transProps
  set transDelay to transition delay of transProps
  return (transEffect as text) & "|||" & transDuration & "|||" & transDelay`
          );
          const result = await runAppleScript(script);
          const parts = result.split("|||");

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: true,
                  slideIndex,
                  transition: {
                    effect: parts[0]?.trim() ?? "unknown",
                    duration: parseFloat(parts[1]?.trim() ?? "0"),
                    delay: parseFloat(parts[2]?.trim() ?? "0"),
                  },
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
    }
  );

  // ── list_transition_types ───────────────────────────────────────────
  server.tool(
    "list_transition_types",
    "Returns a list of all available Keynote slide transition effect names. These can be used with the set_slide_transition tool.",
    {},
    async () => {
      const effects = Object.keys(TRANSITION_EFFECTS).map((name) => ({
        name,
        description: getTransitionDescription(name),
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              count: effects.length,
              transitions: effects,
            }),
          },
        ],
      };
    }
  );

  // ── add_build_animation ─────────────────────────────────────────────
  server.tool(
    "add_build_animation",
    "Adds a build-in or build-out animation to an item on a slide. Build-in animations play when the item appears; build-out animations play when it exits.",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      itemIndex: z.number().int().min(1).describe("1-based item index on the slide"),
      type: z
        .enum(["appear", "dissolve", "scale", "move_in", "fly_in", "fade_and_move"])
        .describe("Animation effect type"),
      buildType: z
        .enum(["in", "out"])
        .describe("Whether this is a build-in (entrance) or build-out (exit) animation"),
      duration: z
        .number()
        .min(0)
        .optional()
        .default(1.0)
        .describe("Animation duration in seconds (default: 1.0)"),
    },
    async ({ slideIndex, itemIndex, type, buildType, duration }) => {
      try {
        const keynoteEffect = BUILD_EFFECTS[type];
        if (!keynoteEffect) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  error: `Unknown build animation type "${type}". Available: ${Object.keys(BUILD_EFFECTS).join(", ")}`,
                }),
              },
            ],
            isError: true,
          };
        }

        // Use JXA for build animation manipulation — more reliable than AppleScript
        // Keynote JXA: iWorkItems are 0-indexed
        const buildProp = buildType === "in" ? "buildIn" : "buildOut";
        const script = `
          var app = Application("Keynote");
          var slide = app.documents[0].slides[${slideIndex - 1}];
          var items = slide.iWorkItems();
          if (${itemIndex - 1} >= items.length) {
            throw new Error("Item index ${itemIndex} is out of range. Slide has " + items.length + " items.");
          }
          var item = items[${itemIndex - 1}];
          var buildProps = {};
          buildProps.effect = "${keynoteEffect}";
          buildProps.duration = ${duration};
          item.${buildProp}.properties = buildProps;
          JSON.stringify({
            success: true,
            slideIndex: ${slideIndex},
            itemIndex: ${itemIndex},
            buildType: "${buildType}",
            effect: "${type}",
            duration: ${duration},
            message: "Build-${buildType} animation '${type}' added to item ${itemIndex} on slide ${slideIndex}"
          });
        `;

        const result = await runJXA(script);
        return {
          content: [
            {
              type: "text" as const,
              text: result || JSON.stringify({
                success: true,
                slideIndex,
                itemIndex,
                buildType,
                effect: type,
                duration,
                message: `Build-${buildType} animation "${type}" added to item ${itemIndex} on slide ${slideIndex}`,
              }),
            },
          ],
        };
      } catch (jxaError) {
        // Fallback: AppleScript approach
        try {
          const keynoteEffect = BUILD_EFFECTS[type];
          const buildProp = buildType === "in" ? "build in" : "build out";
          const script = keynoteScript(
            `  tell slide ${slideIndex} of front document
    set targetItem to iWork item ${itemIndex}
    set properties of ${buildProp} of targetItem to {effect:${keynoteEffect}, duration:${duration}}
  end tell
  return "done"`
          );
          await runAppleScript(script);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: true,
                  slideIndex,
                  itemIndex,
                  buildType,
                  effect: type,
                  duration,
                  message: `Build-${buildType} animation "${type}" added to item ${itemIndex} on slide ${slideIndex}`,
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
    }
  );

  // ── remove_build_animation ──────────────────────────────────────────
  server.tool(
    "remove_build_animation",
    "Removes a build-in or build-out animation from an item on a slide.",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
      itemIndex: z.number().int().min(1).describe("1-based item index on the slide"),
      buildType: z
        .enum(["in", "out"])
        .describe("Whether to remove the build-in or build-out animation"),
    },
    async ({ slideIndex, itemIndex, buildType }) => {
      try {
        // Use JXA to remove the build animation by setting effect to "none"
        const buildProp = buildType === "in" ? "buildIn" : "buildOut";
        const script = `
          var app = Application("Keynote");
          var slide = app.documents[0].slides[${slideIndex - 1}];
          var items = slide.iWorkItems();
          if (${itemIndex - 1} >= items.length) {
            throw new Error("Item index ${itemIndex} is out of range. Slide has " + items.length + " items.");
          }
          var item = items[${itemIndex - 1}];
          item.${buildProp}.properties = { effect: "none" };
          JSON.stringify({
            success: true,
            slideIndex: ${slideIndex},
            itemIndex: ${itemIndex},
            buildType: "${buildType}",
            message: "Build-${buildType} animation removed from item ${itemIndex} on slide ${slideIndex}"
          });
        `;

        const result = await runJXA(script);
        return {
          content: [
            {
              type: "text" as const,
              text: result || JSON.stringify({
                success: true,
                slideIndex,
                itemIndex,
                buildType,
                message: `Build-${buildType} animation removed from item ${itemIndex} on slide ${slideIndex}`,
              }),
            },
          ],
        };
      } catch (jxaError) {
        // Fallback: AppleScript approach
        try {
          const buildProp = buildType === "in" ? "build in" : "build out";
          const script = keynoteScript(
            `  tell slide ${slideIndex} of front document
    set targetItem to iWork item ${itemIndex}
    set properties of ${buildProp} of targetItem to {effect:none}
  end tell
  return "done"`
          );
          await runAppleScript(script);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: true,
                  slideIndex,
                  itemIndex,
                  buildType,
                  message: `Build-${buildType} animation removed from item ${itemIndex} on slide ${slideIndex}`,
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
    }
  );

  // ── list_build_animations ───────────────────────────────────────────
  server.tool(
    "list_build_animations",
    "Lists all build-in and build-out animations for every item on a given slide.",
    {
      slideIndex: z.number().int().min(1).describe("1-based slide index"),
    },
    async ({ slideIndex }) => {
      try {
        // Use JXA to enumerate items and their build animations
        const script = `
          var app = Application("Keynote");
          var slide = app.documents[0].slides[${slideIndex - 1}];
          var items = slide.iWorkItems();
          var result = [];
          for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var entry = {
              itemIndex: i + 1,
              name: ""
            };
            try { entry.name = item.name(); } catch(e) { entry.name = "unnamed"; }

            // Build-in
            try {
              var buildIn = item.buildIn.properties();
              entry.buildIn = {
                effect: buildIn.effect || "none",
                duration: buildIn.duration || 0
              };
            } catch(e) {
              entry.buildIn = { effect: "none", duration: 0 };
            }

            // Build-out
            try {
              var buildOut = item.buildOut.properties();
              entry.buildOut = {
                effect: buildOut.effect || "none",
                duration: buildOut.duration || 0
              };
            } catch(e) {
              entry.buildOut = { effect: "none", duration: 0 };
            }

            result.push(entry);
          }
          JSON.stringify({
            success: true,
            slideIndex: ${slideIndex},
            itemCount: items.length,
            items: result
          });
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

/**
 * Returns a short human-readable description for a transition effect name.
 */
function getTransitionDescription(name: string): string {
  const descriptions: Record<string, string> = {
    "none": "No transition effect",
    "magic move": "Automatically animates matching objects between slides",
    "shimmer": "Shimmering particle effect",
    "sparkle": "Sparkling particle effect",
    "swing": "Slides swing in from the side",
    "dissolve": "Crossfade between slides",
    "cube": "3D cube rotation",
    "flip": "3D flip between slides",
    "mosaic": "Breaks into mosaic tiles",
    "push": "New slide pushes old slide off screen",
    "reveal": "Old slide moves to reveal new slide underneath",
    "switch": "Slides switch places with a 3D effect",
    "wipe": "Wipes across the slide",
    "blinds": "Venetian blind effect",
    "color planes": "Color planes sweep across",
    "confetti": "Confetti particle burst",
    "doorway": "Old slide opens like a doorway",
    "drop": "New slide drops in from above",
    "fall": "Old slide falls away",
    "flop": "Slide flops over",
    "iris": "Circular iris wipe",
    "move in": "New slide moves in over the old slide",
    "object cube": "Objects rotate on a 3D cube",
    "object flip": "Objects flip in 3D",
    "object pop": "Objects pop in",
    "object push": "Objects push each other",
    "object revolve": "Objects revolve in 3D",
    "object zoom": "Objects zoom in/out",
    "perspective": "3D perspective shift",
    "revolving door": "Slides rotate like a revolving door",
    "scale": "Scale transition between slides",
    "swoosh": "Swoosh effect between slides",
    "twirl": "Twirling transition",
    "twist": "Twist transition between slides",
  };
  return descriptions[name] ?? "Transition effect";
}
