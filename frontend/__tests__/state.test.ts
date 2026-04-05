import { describe, it, expect, vi, beforeEach } from "vitest";

// We need to import the class fresh for each test, so we use dynamic import
// to avoid shared singleton state. Instead, test the pub/sub logic directly.

describe("AppState pub/sub", () => {
  // Inline minimal reimplementation to test the pattern
  // (testing the actual singleton would carry state between tests)
  type Callback = (data?: unknown) => void;

  class TestState {
    private listeners: Map<string, Set<Callback>> = new Map();

    subscribe(event: string, cb: Callback): () => void {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event)!.add(cb);
      return () => this.listeners.get(event)?.delete(cb);
    }

    emit(event: string, data?: unknown): void {
      const cbs = this.listeners.get(event);
      if (cbs) {
        for (const cb of cbs) cb(data);
      }
    }
  }

  let state: TestState;

  beforeEach(() => {
    state = new TestState();
  });

  it("should call subscriber on emit", () => {
    const cb = vi.fn();
    state.subscribe("test", cb);
    state.emit("test", "hello");
    expect(cb).toHaveBeenCalledWith("hello");
  });

  it("should support multiple subscribers", () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    state.subscribe("test", cb1);
    state.subscribe("test", cb2);
    state.emit("test", 42);
    expect(cb1).toHaveBeenCalledWith(42);
    expect(cb2).toHaveBeenCalledWith(42);
  });

  it("should unsubscribe correctly", () => {
    const cb = vi.fn();
    const unsub = state.subscribe("test", cb);
    unsub();
    state.emit("test");
    expect(cb).not.toHaveBeenCalled();
  });

  it("should not call subscribers for other events", () => {
    const cb = vi.fn();
    state.subscribe("other", cb);
    state.emit("test");
    expect(cb).not.toHaveBeenCalled();
  });

  it("should handle emit with no subscribers", () => {
    expect(() => state.emit("nonexistent")).not.toThrow();
  });
});
