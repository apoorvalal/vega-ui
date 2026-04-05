/**
 * Application state with a lightweight pub/sub event system.
 */
import type { ChartSession, Selection, VegaLiteSpec } from "./types";

export type AppEvent =
  | "spec-changed"
  | "selection-changed"
  | "session-created"
  | "mutation-applied"
  | "error";

type Callback = (data?: unknown) => void;

class AppState {
  session: ChartSession | null = null;
  selection: Selection | null = null;

  private listeners: Map<AppEvent, Set<Callback>> = new Map();

  subscribe(event: AppEvent, cb: Callback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(cb);
    return () => this.listeners.get(event)?.delete(cb);
  }

  emit(event: AppEvent, data?: unknown): void {
    const cbs = this.listeners.get(event);
    if (cbs) {
      for (const cb of cbs) {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in ${event} listener:`, err);
        }
      }
    }
  }

  get spec(): VegaLiteSpec | null {
    return this.session?.spec ?? null;
  }

  get sessionId(): string | null {
    return this.session?.id ?? null;
  }

  setSession(session: ChartSession): void {
    this.session = session;
    this.selection = null;
    this.emit("session-created", session);
    this.emit("spec-changed", session.spec);
    this.emit("selection-changed", null);
  }

  updateSpec(spec: VegaLiteSpec): void {
    if (this.session) {
      this.session.spec = spec;
      this.emit("spec-changed", spec);
      this.emit("mutation-applied", spec);
    }
  }

  setSelection(selection: Selection | null): void {
    this.selection = selection;
    this.emit("selection-changed", selection);
  }

  clearSelection(): void {
    this.setSelection(null);
  }
}

/** Singleton application state. */
export const state = new AppState();
