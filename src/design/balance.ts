/**
 * Visual balance and spacing utilities for slide composition (US-014).
 *
 * Provides padding, minimum-spacing enforcement, visual-weight calculation,
 * and left-right / top-bottom composition balancing.
 */

import type { Rect } from "./tokens.js";

// ---------------------------------------------------------------------------
// Local types (will move to layouts.ts later)
// ---------------------------------------------------------------------------

export interface ResolvedElement {
  id: string;
  type: "text" | "image" | "shape";
  role: string;
  rect: Rect;
  padding?: number;
}

// ---------------------------------------------------------------------------
// Padding
// ---------------------------------------------------------------------------

/**
 * Inset a rectangle by the given padding amounts.
 *
 * `padding` may be a uniform number or an object with per-side values.
 * The returned rect is clamped so that width/height never go negative.
 */
export function addPadding(
  rect: Rect,
  padding: number | { top: number; right: number; bottom: number; left: number },
): Rect {
  const top = typeof padding === "number" ? padding : padding.top;
  const right = typeof padding === "number" ? padding : padding.right;
  const bottom = typeof padding === "number" ? padding : padding.bottom;
  const left = typeof padding === "number" ? padding : padding.left;

  return {
    x: rect.x + left,
    y: rect.y + top,
    width: Math.max(0, rect.width - left - right),
    height: Math.max(0, rect.height - top - bottom),
  };
}

// ---------------------------------------------------------------------------
// Minimum spacing
// ---------------------------------------------------------------------------

/**
 * Return the overlap between two 1-D intervals `[aStart, aEnd)` and
 * `[bStart, bEnd)`.  A positive value means they overlap by that amount.
 */
function intervalOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

/**
 * Nudge overlapping rectangles apart so that every pair has at least
 * `minGap` points of space between them.
 *
 * For each overlapping pair the nudge is applied along whichever axis has
 * the *least* overlap, keeping the total displacement small.
 *
 * The algorithm is iterative (up to a fixed limit) because separating one
 * pair can create a new overlap with a third element.
 */
export function ensureMinSpacing(elements: Rect[], minGap: number): Rect[] {
  // Deep-copy so we never mutate the caller's data.
  const rects: Rect[] = elements.map((r) => ({ ...r }));

  const MAX_ITERATIONS = 50;

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let anyAdjusted = false;

    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];

        // Compute overlap on each axis, including the desired gap.
        const overlapX = intervalOverlap(
          a.x - minGap,
          a.x + a.width + minGap,
          b.x,
          b.x + b.width,
        );
        const overlapY = intervalOverlap(
          a.y - minGap,
          a.y + a.height + minGap,
          b.y,
          b.y + b.height,
        );

        if (overlapX <= 0 || overlapY <= 0) {
          // No 2-D overlap (including gap) -- nothing to do.
          continue;
        }

        anyAdjusted = true;

        // Nudge along the axis with the *least* overlap.
        if (overlapX <= overlapY) {
          // Separate horizontally.
          const halfShift = overlapX / 2;
          if (a.x + a.width / 2 <= b.x + b.width / 2) {
            a.x -= halfShift;
            b.x += halfShift;
          } else {
            a.x += halfShift;
            b.x -= halfShift;
          }
        } else {
          // Separate vertically.
          const halfShift = overlapY / 2;
          if (a.y + a.height / 2 <= b.y + b.height / 2) {
            a.y -= halfShift;
            b.y += halfShift;
          } else {
            a.y += halfShift;
            b.y -= halfShift;
          }
        }
      }
    }

    if (!anyAdjusted) break;
  }

  return rects;
}

// ---------------------------------------------------------------------------
// Visual weight
// ---------------------------------------------------------------------------

/** Weight multipliers by element type. */
const TYPE_WEIGHT: Record<ResolvedElement["type"], number> = {
  image: 1.5,
  shape: 1.2,
  text: 1.0,
};

/**
 * Calculate the *visual weight* of an element.
 *
 * Weight is a unitless score derived from:
 *
 * 1. **Size** -- the area of the element's bounding rect.
 * 2. **Type** -- images draw the eye more than shapes, which draw more
 *    than text.  Multipliers: image 1.5, shape 1.2, text 1.0.
 * 3. **Color darkness** -- darker elements feel heavier.  Because the
 *    design engine doesn't track fill color on every element yet, we
 *    use a fixed darkness factor of 0.5 (mid-range) as a sensible
 *    default.  This keeps the API stable while leaving room for a
 *    future `color` property.
 *
 * Formula: `area * typeMultiplier * (0.5 + darknessFactor)`
 */
export function calculateVisualWeight(element: ResolvedElement): number {
  const area = element.rect.width * element.rect.height;
  const typeMultiplier = TYPE_WEIGHT[element.type];
  // Default darkness factor (0 = white / light, 1 = black / dark).
  const darknessFactor = 0.5;

  return area * typeMultiplier * (0.5 + darknessFactor);
}

// ---------------------------------------------------------------------------
// Composition balancing
// ---------------------------------------------------------------------------

/** Centre point of a rect. */
function centre(r: Rect): { cx: number; cy: number } {
  return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
}

/**
 * Adjust element positions so that the visual weight is balanced both
 * left-right and top-bottom.
 *
 * **Algorithm:**
 *
 * 1. Compute a bounding box enclosing all elements.
 * 2. Find the weighted centroid (using `calculateVisualWeight` for each
 *    element).
 * 3. Determine how far the centroid deviates from the geometric centre
 *    of the bounding box.
 * 4. Shift each element by a fraction of the deviation that is
 *    proportional to its own weight contribution -- heavier elements
 *    move less, lighter elements move more.  This keeps the overall
 *    layout recognisable while pulling the centroid toward the centre.
 *
 * Returns a new array; input elements are not mutated.
 */
export function balanceComposition(
  elements: ResolvedElement[],
): ResolvedElement[] {
  if (elements.length === 0) return [];

  // 1. Bounding box of all elements.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    minX = Math.min(minX, el.rect.x);
    minY = Math.min(minY, el.rect.y);
    maxX = Math.max(maxX, el.rect.x + el.rect.width);
    maxY = Math.max(maxY, el.rect.y + el.rect.height);
  }

  const bboxCx = (minX + maxX) / 2;
  const bboxCy = (minY + maxY) / 2;

  // 2. Weighted centroid.
  let totalWeight = 0;
  let weightedSumX = 0;
  let weightedSumY = 0;

  const weights: number[] = [];

  for (const el of elements) {
    const w = calculateVisualWeight(el);
    weights.push(w);
    totalWeight += w;
    const c = centre(el.rect);
    weightedSumX += c.cx * w;
    weightedSumY += c.cy * w;
  }

  if (totalWeight === 0) {
    // All zero-area elements -- nothing useful to balance.
    return elements.map((el) => ({ ...el, rect: { ...el.rect } }));
  }

  const centroidX = weightedSumX / totalWeight;
  const centroidY = weightedSumY / totalWeight;

  // 3. Deviation from bbox centre.
  const deviationX = bboxCx - centroidX;
  const deviationY = bboxCy - centroidY;

  // Small threshold to avoid needless micro-adjustments (1 pt).
  const THRESHOLD = 1;
  if (Math.abs(deviationX) < THRESHOLD && Math.abs(deviationY) < THRESHOLD) {
    return elements.map((el) => ({ ...el, rect: { ...el.rect } }));
  }

  // 4. Shift each element inversely proportional to its weight share.
  //    Lighter elements move more; heavier elements move less.
  //    The total effect pulls the weighted centroid toward the bbox centre.
  const maxWeight = Math.max(...weights);

  return elements.map((el, i) => {
    // Normalised inverse weight: 1 for the lightest, smaller for heavier.
    const normWeight = maxWeight === 0 ? 1 : weights[i] / maxWeight;
    // Inverse: light elements get factor ~1, heavy ~close-to-0.
    const moveFactor = 1 - normWeight + 0.1; // +0.1 so even heaviest moves a little

    return {
      ...el,
      rect: {
        ...el.rect,
        x: el.rect.x + deviationX * moveFactor,
        y: el.rect.y + deviationY * moveFactor,
      },
    };
  });
}
