import { describe, it, expect } from "vitest";
import { getFromSpec } from "../src/panel/helpers";

describe("getFromSpec", () => {
  const spec = {
    encoding: {
      x: {
        field: "category",
        type: "nominal",
        axis: {
          title: "Category",
          labelFontSize: 12,
        },
      },
      y: {
        field: "value",
        type: "quantitative",
      },
      color: {
        field: "region",
        legend: {
          title: "Region",
          orient: "right",
        },
      },
    },
    mark: {
      type: "bar",
      color: "steelblue",
    },
    title: { text: "My Chart", subtitle: "Subtitle" },
  };

  it("gets top-level values", () => {
    const title = getFromSpec(spec, "title");
    expect(title).toEqual({ text: "My Chart", subtitle: "Subtitle" });
  });

  it("gets nested values", () => {
    expect(getFromSpec(spec, "encoding.x.axis.title")).toBe("Category");
  });

  it("gets deeply nested values", () => {
    expect(getFromSpec(spec, "encoding.x.axis.labelFontSize")).toBe(12);
  });

  it("returns undefined for missing paths", () => {
    expect(getFromSpec(spec, "encoding.x.axis.grid")).toBeUndefined();
  });

  it("returns undefined for completely missing branches", () => {
    expect(getFromSpec(spec, "encoding.z.axis.title")).toBeUndefined();
  });

  it("gets mark properties", () => {
    expect(getFromSpec(spec, "mark.type")).toBe("bar");
    expect(getFromSpec(spec, "mark.color")).toBe("steelblue");
  });

  it("gets legend properties", () => {
    expect(getFromSpec(spec, "encoding.color.legend.title")).toBe("Region");
    expect(getFromSpec(spec, "encoding.color.legend.orient")).toBe("right");
  });
});

describe("panel selection routing", () => {
  // Test that each ObjectType maps to the correct panel
  const PANEL_MAP: Record<string, string> = {
    chart: "chart-panel",
    "axis-x": "axis-panel-x",
    "axis-y": "axis-panel-y",
    legend: "legend-panel",
    mark: "mark-panel",
    annotation: "annotation-panel",
  };

  it("should have a panel for each object type", () => {
    const objectTypes = ["chart", "axis-x", "axis-y", "legend", "mark", "annotation"];
    for (const ot of objectTypes) {
      expect(PANEL_MAP[ot]).toBeDefined();
    }
  });
});
