/**
 * Property panel for mark styling.
 */
import { dispatchMutation } from "../mutation";
import { state } from "../state";
import {
  colorInput,
  numberInput,
  rangeInput,
  row,
  sectionHeader,
} from "./helpers";

export function renderMarkPanel(container: HTMLElement): void {
  const spec = state.spec;
  if (!spec) return;

  container.innerHTML = "";
  container.appendChild(sectionHeader("Mark Style"));

  const mark = spec["mark"] as Record<string, unknown> | string | undefined;
  const markObj = typeof mark === "string" ? { type: mark } : mark ?? {};
  const markType = (markObj["type"] as string) ?? "unknown";

  const typeLabel = document.createElement("p");
  typeLabel.className = "panel-info";
  typeLabel.textContent = `Type: ${markType}`;
  container.appendChild(typeLabel);

  // Fill color
  const color = (markObj["color"] as string) ?? (markObj["fill"] as string) ?? "#4c78a8";
  container.appendChild(
    row("Color", colorInput(color, (v) => dispatchMutation("mark.color", v))),
  );

  // Stroke color
  const stroke = (markObj["stroke"] as string) ?? "";
  container.appendChild(
    row("Stroke", colorInput(stroke || "#000000", (v) => dispatchMutation("mark.stroke", v))),
  );

  // Opacity
  const opacity = (markObj["opacity"] as number) ?? 1;
  container.appendChild(
    row(
      `Opacity (${opacity.toFixed(2)})`,
      rangeInput(opacity, (v) => dispatchMutation("mark.opacity", v), {
        min: 0,
        max: 1,
        step: 0.05,
      }),
    ),
  );

  // Stroke width
  const strokeWidth = (markObj["strokeWidth"] as number) ?? 1;
  container.appendChild(
    row(
      "Stroke width",
      numberInput(strokeWidth, (v) => dispatchMutation("mark.strokeWidth", v), {
        min: 0,
        max: 10,
        step: 0.5,
      }),
    ),
  );

  // Size (for point marks)
  if (markType === "point" || markType === "circle" || markType === "square") {
    const size = (markObj["size"] as number) ?? 100;
    container.appendChild(
      row(
        "Size",
        numberInput(size, (v) => dispatchMutation("mark.size", v), {
          min: 1,
          max: 1000,
          step: 10,
        }),
      ),
    );
  }
}
