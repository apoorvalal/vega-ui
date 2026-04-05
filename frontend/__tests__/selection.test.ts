import { describe, it, expect } from "vitest";
import { roleToObjectType, positionToSelection } from "../src/selection";

describe("roleToObjectType", () => {
  it("maps title role to chart object", () => {
    const result = roleToObjectType("title", {});
    expect(result).toEqual({ objectType: "chart", objectId: "title" });
  });

  it("maps title-text role to chart object", () => {
    const result = roleToObjectType("title-text", {});
    expect(result).toEqual({ objectType: "chart", objectId: "title" });
  });

  it("maps axis-title role to axis", () => {
    const result = roleToObjectType("axis-title", {});
    expect(result).not.toBeNull();
    expect(result!.objectType).toMatch(/^axis-/);
  });

  it("maps axis-label role to axis", () => {
    const result = roleToObjectType("axis-label", {});
    expect(result).not.toBeNull();
    expect(result!.objectType).toMatch(/^axis-/);
  });

  it("maps legend-title to legend", () => {
    const result = roleToObjectType("legend-title", {});
    expect(result).toEqual({ objectType: "legend", objectId: "legend" });
  });

  it("maps legend-symbol to legend", () => {
    const result = roleToObjectType("legend-symbol", {});
    expect(result).toEqual({ objectType: "legend", objectId: "legend" });
  });

  it("maps mark to mark", () => {
    const result = roleToObjectType("mark", {});
    expect(result).toEqual({ objectType: "mark", objectId: "mark" });
  });

  it("returns null for undefined role", () => {
    expect(roleToObjectType(undefined, {})).toBeNull();
  });

  it("returns null for unknown role", () => {
    expect(roleToObjectType("unknown-role", {})).toBeNull();
  });
});

describe("positionToSelection", () => {
  const W = 800;
  const H = 600;

  it("maps top region to chart title", () => {
    const result = positionToSelection(400, 10, W, H);
    expect(result).toEqual({ objectType: "chart", objectId: "title" });
  });

  it("maps bottom region to x-axis", () => {
    const result = positionToSelection(400, 570, W, H);
    expect(result).toEqual({ objectType: "axis-x", objectId: "axis-x" });
  });

  it("maps left region to y-axis", () => {
    const result = positionToSelection(30, 300, W, H);
    expect(result).toEqual({ objectType: "axis-y", objectId: "axis-y" });
  });

  it("maps right region to legend", () => {
    const result = positionToSelection(750, 300, W, H);
    expect(result).toEqual({ objectType: "legend", objectId: "legend" });
  });

  it("maps center region to mark", () => {
    const result = positionToSelection(400, 300, W, H);
    expect(result).toEqual({ objectType: "mark", objectId: "mark" });
  });
});
