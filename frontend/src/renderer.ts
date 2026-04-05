/**
 * Vega-Embed renderer: renders Vega-Lite specs and exposes the Vega View
 * for scenegraph inspection.
 */
import embed, { type Result } from "vega-embed";
import type { View } from "vega";
import type { VegaLiteSpec } from "./types";
import { state } from "./state";

let container: HTMLElement | null = null;
let currentResult: Result | null = null;

/** Get the current Vega View (for scenegraph hit-testing). */
export function getView(): View | null {
  return currentResult?.view ?? null;
}

/** Initialize the renderer and subscribe to spec changes. */
export function initRenderer(el: HTMLElement): void {
  container = el;
  state.subscribe("spec-changed", (spec) => {
    if (spec) {
      renderSpec(spec as VegaLiteSpec);
    }
  });
}

/** Render a Vega-Lite spec into the container. */
export async function renderSpec(spec: VegaLiteSpec): Promise<void> {
  if (!container) return;

  // Clean up previous view
  if (currentResult) {
    currentResult.finalize();
    currentResult = null;
  }

  // Strip editor metadata before rendering
  const renderSpec = { ...spec };
  delete renderSpec["usermeta"];

  try {
    currentResult = await embed(container, renderSpec as never, {
      actions: false,
      renderer: "svg",
    });
  } catch (err) {
    console.error("Render failed:", err);
    container.innerHTML = `<p class="error">Failed to render chart: ${err}</p>`;
  }
}
