/**
 * Selection system: maps clicks on the rendered chart to logical
 * editor objects using the Vega scenegraph and positional heuristics.
 */
import type { ObjectType, Selection } from "./types";
import { state } from "./state";
import { getView } from "./renderer";

/**
 * Map a Vega scenegraph item's mark role to an editor ObjectType.
 *
 * Vega assigns `role` strings to scenegraph mark groups:
 * - "title", "title-text" -> chart title
 * - "axis-title", "axis-label", "axis-tick", "axis-domain", "axis-grid"
 *    -> axis (orientation determines x vs y)
 * - "legend-title", "legend-label", "legend-symbol", "legend-entry"
 *    -> legend
 * - "mark" -> mark styling
 */
export function roleToObjectType(
  role: string | undefined,
  item: unknown,
): Selection | null {
  if (!role) return null;

  if (role === "title" || role === "title-text" || role === "title-subtitle") {
    return { objectType: "chart", objectId: "title" };
  }

  if (role.startsWith("axis")) {
    const orient = resolveAxisOrientation(item);
    const axisType: ObjectType = orient === "left" || orient === "right" ? "axis-y" : "axis-x";
    return { objectType: axisType, objectId: axisType };
  }

  if (role.startsWith("legend")) {
    return { objectType: "legend", objectId: "legend" };
  }

  if (role === "mark") {
    return { objectType: "mark", objectId: "mark" };
  }

  return null;
}

/**
 * Walk up the scenegraph item hierarchy to find an axis orientation.
 */
function resolveAxisOrientation(item: unknown): string {
  let current = item as Record<string, unknown> | null;
  const maxDepth = 10;
  let depth = 0;
  while (current && depth < maxDepth) {
    // Vega axis groups carry an `orient` datum or an axis config
    const datum = current["datum"] as Record<string, unknown> | undefined;
    if (datum && typeof datum["orient"] === "string") {
      return datum["orient"];
    }
    // Check the mark's role at group level
    const mark = current["mark"] as Record<string, unknown> | undefined;
    if (mark && typeof mark["role"] === "string") {
      const markRole = mark["role"] as string;
      if (markRole.includes("x-axis") || markRole.includes("x_axis")) return "bottom";
      if (markRole.includes("y-axis") || markRole.includes("y_axis")) return "left";
    }
    // Check bounds-based heuristic: items near bottom edge are x-axis
    const bounds = current["bounds"] as Record<string, number> | undefined;
    if (bounds && typeof bounds["y1"] === "number") {
      const view = getView();
      if (view) {
        const height = (view as unknown as Record<string, unknown>)["_height"] as number;
        if (height && bounds["y1"] > height * 0.7) return "bottom";
        if (bounds["x1"] !== undefined && (bounds["x1"] as number) < 50) return "left";
      }
    }
    current = current["parent"] as Record<string, unknown> | null;
    depth++;
  }
  // Default to x-axis
  return "bottom";
}

/**
 * Determine selection from a click position using region-based fallback.
 * Divides the chart area into zones:
 * - Top strip: title
 * - Bottom strip: x-axis
 * - Left strip: y-axis
 * - Right strip: legend
 * - Center: marks
 */
export function positionToSelection(
  x: number,
  y: number,
  width: number,
  height: number,
): Selection | null {
  const titleZone = height * 0.08;
  const axisBottom = height * 0.85;
  const axisLeft = width * 0.12;
  const legendRight = width * 0.85;

  if (y < titleZone) {
    return { objectType: "chart", objectId: "title" };
  }
  if (y > axisBottom) {
    return { objectType: "axis-x", objectId: "axis-x" };
  }
  if (x < axisLeft) {
    return { objectType: "axis-y", objectId: "axis-y" };
  }
  if (x > legendRight) {
    return { objectType: "legend", objectId: "legend" };
  }
  return { objectType: "mark", objectId: "mark" };
}

/**
 * Initialize click handlers on the chart container.
 */
export function initSelection(container: HTMLElement): void {
  container.addEventListener("click", (e: MouseEvent) => {
    const view = getView();
    if (!view) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Try scenegraph hit-test first
    let selection: Selection | null = null;

    try {
      // Access the scenegraph from the Vega View
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const viewAny = view as any;
      const sg = typeof viewAny.scenegraph === "function"
        ? viewAny.scenegraph()
        : undefined;
      if (sg) {
        const handler = viewAny._handler;
        const item = handler && typeof handler.pick === "function"
          ? handler.pick(sg, x, y, x, y)
          : null;
        if (item) {
          const mark = item["mark"] as Record<string, unknown> | undefined;
          const role = mark?.["role"] as string | undefined;
          selection = roleToObjectType(role, item);
        }
      }
    } catch {
      // Scenegraph inspection can fail -- fall back to position
    }

    // Fallback: region-based detection
    if (!selection) {
      selection = positionToSelection(x, y, rect.width, rect.height);
    }

    state.setSelection(selection);
  });

  // Click outside chart clears selection
  document.addEventListener("click", (e: MouseEvent) => {
    if (!container.contains(e.target as Node)) {
      state.clearSelection();
    }
  });
}
