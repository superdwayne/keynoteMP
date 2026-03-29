/**
 * Shared brand state module.
 *
 * Centralises the stored brand configuration so that both the design tools
 * (design.ts) and the individual low-level tools (text.ts, shapes.ts,
 * images.ts) can read/write the same brand state.
 */

import type { BrandConfig } from "./brand.js";
import { resolveBrand } from "./brand.js";

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let currentBrand: Partial<BrandConfig> = {};

// ---------------------------------------------------------------------------
// Accessors
// ---------------------------------------------------------------------------

/** Return the raw stored brand overrides (may be empty). */
export function getCurrentBrand(): Partial<BrandConfig> {
  return { ...currentBrand };
}

/** Replace / merge the stored brand overrides. */
export function setCurrentBrand(brand: Partial<BrandConfig>): void {
  currentBrand = { ...currentBrand, ...brand };
}

/** Clear the stored brand back to defaults. */
export function clearCurrentBrand(): void {
  currentBrand = {};
}

/**
 * Resolve a final BrandConfig by merging:
 *   1. Theme defaults (from active Keynote document)
 *   2. Stored brand overrides (set via `set_brand`)
 *   3. Optional per-call overrides
 *
 * Per-call values take the highest priority.
 */
export async function resolveCurrentBrand(
  perCall?: Partial<BrandConfig>,
): Promise<BrandConfig> {
  const hasStored = Object.keys(currentBrand).length > 0;
  const hasPerCall = perCall !== undefined && Object.keys(perCall).length > 0;

  let merged: Partial<BrandConfig> | undefined;

  if (!hasStored && !hasPerCall) {
    merged = undefined;
  } else if (!hasStored) {
    merged = perCall;
  } else if (!hasPerCall) {
    merged = { ...currentBrand };
  } else {
    merged = { ...currentBrand, ...perCall };
  }

  return resolveBrand(merged);
}
