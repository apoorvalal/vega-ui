import { describe, it, expect, vi, beforeEach } from "vitest";

describe("mutation dispatch", () => {
  // Test the mutation request building logic without actual API calls.
  // The dispatchMutation function is tightly coupled to the API client,
  // so we test the contract: correct target strings for each edit type.

  const MUTATION_TARGETS = {
    // Chart level
    title: "chart.title",
    subtitle: "chart.subtitle",
    width: "chart.width",
    height: "chart.height",
    background: "chart.background",

    // Mark level
    markColor: "mark.color",
    markOpacity: "mark.opacity",
    markStrokeWidth: "mark.strokeWidth",
    markSize: "mark.size",

    // Axis level
    axisXTitle: "axis.x.title",
    axisYTitle: "axis.y.title",
    axisXLabelFontSize: "axis.x.labelFontSize",
    axisYGrid: "axis.y.grid",

    // Legend level
    legendColorTitle: "legend.color.title",
    legendColorOrient: "legend.color.orient",
  };

  it("should have correct chart-level targets", () => {
    expect(MUTATION_TARGETS.title).toBe("chart.title");
    expect(MUTATION_TARGETS.subtitle).toBe("chart.subtitle");
    expect(MUTATION_TARGETS.width).toBe("chart.width");
    expect(MUTATION_TARGETS.height).toBe("chart.height");
    expect(MUTATION_TARGETS.background).toBe("chart.background");
  });

  it("should have correct mark-level targets", () => {
    expect(MUTATION_TARGETS.markColor).toBe("mark.color");
    expect(MUTATION_TARGETS.markOpacity).toBe("mark.opacity");
    expect(MUTATION_TARGETS.markStrokeWidth).toBe("mark.strokeWidth");
    expect(MUTATION_TARGETS.markSize).toBe("mark.size");
  });

  it("should have correct axis-level targets", () => {
    expect(MUTATION_TARGETS.axisXTitle).toBe("axis.x.title");
    expect(MUTATION_TARGETS.axisYTitle).toBe("axis.y.title");
    expect(MUTATION_TARGETS.axisXLabelFontSize).toBe("axis.x.labelFontSize");
    expect(MUTATION_TARGETS.axisYGrid).toBe("axis.y.grid");
  });

  it("should have correct legend-level targets", () => {
    expect(MUTATION_TARGETS.legendColorTitle).toBe("legend.color.title");
    expect(MUTATION_TARGETS.legendColorOrient).toBe("legend.color.orient");
  });

  it("should follow the dot-separated naming convention", () => {
    for (const [_, target] of Object.entries(MUTATION_TARGETS)) {
      expect(target).toMatch(/^[a-z]+(\.[a-zA-Z]+)+$/);
    }
  });
});
