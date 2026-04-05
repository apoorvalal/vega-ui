/**
 * Mutation dispatch: send mutations to the backend and update local state.
 */
import { mutateChart, undoChart, addAnnotation, removeAnnotation } from "./api";
import { state } from "./state";
import type { AnnotationAdd, MutationRequest } from "./types";

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 150;

/**
 * Dispatch a single mutation to the backend.
 * Debounces rapid changes (e.g., from sliders or color pickers).
 */
export function dispatchMutation(target: string, value: unknown): void {
  if (debounceTimer) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(async () => {
    const sessionId = state.sessionId;
    if (!sessionId) return;

    try {
      const result = await mutateChart(sessionId, [{ target, value }]);
      if (result.valid) {
        state.updateSpec(result.spec);
      } else {
        console.error("Mutation rejected:", result.errors);
        state.emit("error", result.errors.join("; "));
      }
    } catch (err) {
      console.error("Mutation failed:", err);
      state.emit("error", String(err));
    }
  }, DEBOUNCE_MS);
}

/**
 * Dispatch a batch of mutations.
 */
export async function dispatchMutations(mutations: MutationRequest[]): Promise<void> {
  const sessionId = state.sessionId;
  if (!sessionId) return;

  try {
    const result = await mutateChart(sessionId, mutations);
    if (result.valid) {
      state.updateSpec(result.spec);
    } else {
      console.error("Batch mutation rejected:", result.errors);
      state.emit("error", result.errors.join("; "));
    }
  } catch (err) {
    console.error("Batch mutation failed:", err);
    state.emit("error", String(err));
  }
}

/**
 * Undo the last mutation.
 */
export async function dispatchUndo(): Promise<void> {
  const sessionId = state.sessionId;
  if (!sessionId) return;

  try {
    const result = await undoChart(sessionId);
    state.updateSpec(result.spec);
  } catch (err) {
    console.error("Undo failed:", err);
    state.emit("error", String(err));
  }
}

/**
 * Add an annotation to the chart.
 */
export async function dispatchAddAnnotation(annotation: AnnotationAdd): Promise<void> {
  const sessionId = state.sessionId;
  if (!sessionId) return;

  try {
    const result = await addAnnotation(sessionId, annotation);
    if (result.valid) {
      state.updateSpec(result.spec);
    }
  } catch (err) {
    console.error("Add annotation failed:", err);
    state.emit("error", String(err));
  }
}

/**
 * Remove an annotation from the chart.
 */
export async function dispatchRemoveAnnotation(annotationId: string): Promise<void> {
  const sessionId = state.sessionId;
  if (!sessionId) return;

  try {
    const result = await removeAnnotation(sessionId, { annotation_id: annotationId });
    if (result.valid) {
      state.updateSpec(result.spec);
    }
  } catch (err) {
    console.error("Remove annotation failed:", err);
    state.emit("error", String(err));
  }
}
