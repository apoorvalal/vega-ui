/**
 * Property panel for axis editing (x or y).
 */
import { dispatchMutation } from "../mutation";
import { state } from "../state";
import type { ObjectType } from "../types";
import {
  checkboxInput,
  getFromSpec,
  numberInput,
  row,
  sectionHeader,
  textInput,
} from "./helpers";

export function renderAxisPanel(container: HTMLElement, axis: "x" | "y"): void {
  const spec = state.spec;
  if (!spec) return;

  container.innerHTML = "";
  container.appendChild(sectionHeader(`${axis.toUpperCase()} Axis`));

  const encoding = spec["encoding"] as Record<string, unknown> | undefined;
  const ch = encoding?.[axis] as Record<string, unknown> | undefined;
  const axisConfig = (ch?.["axis"] as Record<string, unknown>) ?? {};

  // Axis title
  const title = (axisConfig["title"] as string) ?? (ch?.["field"] as string) ?? "";
  container.appendChild(
    row(
      "Title",
      textInput(title, (v) => dispatchMutation(`axis.${axis}.title`, v)),
    ),
  );

  // Label font size
  const labelFs = axisConfig["labelFontSize"] as number | undefined;
  container.appendChild(
    row(
      "Label size",
      numberInput(labelFs ?? 11, (v) => dispatchMutation(`axis.${axis}.labelFontSize`, v), {
        min: 6,
        max: 30,
      }),
    ),
  );

  // Title font size
  const titleFs = axisConfig["titleFontSize"] as number | undefined;
  container.appendChild(
    row(
      "Title size",
      numberInput(titleFs ?? 11, (v) =>
        dispatchMutation(`axis.${axis}.titleFontSize`, v),
      { min: 6, max: 30 }),
    ),
  );

  // Grid
  const grid = (axisConfig["grid"] as boolean) ?? true;
  container.appendChild(
    row(
      "Grid",
      checkboxInput(grid, (v) => dispatchMutation(`axis.${axis}.grid`, v)),
    ),
  );

  // Ticks
  const ticks = (axisConfig["ticks"] as boolean) ?? true;
  container.appendChild(
    row(
      "Ticks",
      checkboxInput(ticks, (v) => dispatchMutation(`axis.${axis}.ticks`, v)),
    ),
  );

  // Format
  const format = (axisConfig["format"] as string) ?? "";
  container.appendChild(
    row(
      "Format",
      textInput(format, (v) => dispatchMutation(`axis.${axis}.format`, v)),
    ),
  );

  // Label angle
  const angle = axisConfig["labelAngle"] as number | undefined;
  container.appendChild(
    row(
      "Label angle",
      numberInput(angle ?? 0, (v) => dispatchMutation(`axis.${axis}.labelAngle`, v), {
        min: -90,
        max: 90,
      }),
    ),
  );
}
