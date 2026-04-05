/**
 * Property panel for chart-level edits: title, subtitle, width, height, background.
 */
import { dispatchMutation } from "../mutation";
import { state } from "../state";
import {
  colorInput,
  getFromSpec,
  numberInput,
  row,
  sectionHeader,
  textInput,
} from "./helpers";

export function renderChartPanel(container: HTMLElement): void {
  const spec = state.spec;
  if (!spec) return;

  container.innerHTML = "";
  container.appendChild(sectionHeader("Chart"));

  // Title
  const titleObj = spec["title"] as Record<string, unknown> | string | undefined;
  const titleText =
    typeof titleObj === "string"
      ? titleObj
      : typeof titleObj === "object" && titleObj
        ? String(titleObj["text"] ?? "")
        : "";
  container.appendChild(
    row("Title", textInput(titleText, (v) => dispatchMutation("chart.title", v))),
  );

  // Subtitle
  const subtitleText =
    typeof titleObj === "object" && titleObj ? String(titleObj["subtitle"] ?? "") : "";
  container.appendChild(
    row(
      "Subtitle",
      textInput(subtitleText, (v) => dispatchMutation("chart.subtitle", v)),
    ),
  );

  // Width
  const width = spec["width"] as number | undefined;
  container.appendChild(
    row(
      "Width",
      numberInput(width, (v) => dispatchMutation("chart.width", v), { min: 50, step: 10 }),
    ),
  );

  // Height
  const height = spec["height"] as number | undefined;
  container.appendChild(
    row(
      "Height",
      numberInput(height, (v) => dispatchMutation("chart.height", v), {
        min: 50,
        step: 10,
      }),
    ),
  );

  // Background
  const bg = (spec["background"] as string) ?? "#ffffff";
  container.appendChild(
    row("Background", colorInput(bg, (v) => dispatchMutation("chart.background", v))),
  );
}
