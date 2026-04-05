/**
 * Property panel for legend editing.
 */
import { dispatchMutation } from "../mutation";
import { state } from "../state";
import {
  numberInput,
  row,
  sectionHeader,
  selectInput,
  textInput,
} from "./helpers";

export function renderLegendPanel(container: HTMLElement): void {
  const spec = state.spec;
  if (!spec) return;

  container.innerHTML = "";
  container.appendChild(sectionHeader("Legend"));

  const encoding = spec["encoding"] as Record<string, unknown> | undefined;
  if (!encoding) return;

  // Find the first channel with a legend
  const legendChannels = ["color", "size", "shape", "opacity"];
  for (const channel of legendChannels) {
    const ch = encoding[channel] as Record<string, unknown> | undefined;
    if (!ch) continue;

    const legend = (ch["legend"] as Record<string, unknown>) ?? {};

    const subHeader = document.createElement("h4");
    subHeader.className = "panel-subsection";
    subHeader.textContent = channel.charAt(0).toUpperCase() + channel.slice(1);
    container.appendChild(subHeader);

    // Title
    const title = (legend["title"] as string) ?? (ch["field"] as string) ?? "";
    container.appendChild(
      row(
        "Title",
        textInput(title, (v) => dispatchMutation(`legend.${channel}.title`, v)),
      ),
    );

    // Orient
    const orient = (legend["orient"] as string) ?? "right";
    container.appendChild(
      row(
        "Position",
        selectInput(orient, ["top", "bottom", "left", "right"], (v) =>
          dispatchMutation(`legend.${channel}.orient`, v),
        ),
      ),
    );

    // Label font size
    const labelFs = legend["labelFontSize"] as number | undefined;
    container.appendChild(
      row(
        "Label size",
        numberInput(labelFs ?? 11, (v) =>
          dispatchMutation(`legend.${channel}.labelFontSize`, v),
        { min: 6, max: 30 }),
      ),
    );
  }
}
