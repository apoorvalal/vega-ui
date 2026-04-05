/**
 * Property panel controller: routes selection changes to the correct sub-panel.
 */
import type { Selection } from "../types";
import { state } from "../state";
import { renderChartPanel } from "./chart-panel";
import { renderAxisPanel } from "./axis-panel";
import { renderLegendPanel } from "./legend-panel";
import { renderMarkPanel } from "./mark-panel";
import { renderAnnotationPanel } from "./annotation-panel";

let panelContainer: HTMLElement | null = null;

function renderEmpty(): void {
  if (!panelContainer) return;
  panelContainer.innerHTML = `
    <div class="panel-empty">
      <p>Click on a chart element to edit its properties.</p>
      <ul>
        <li>Title / subtitle</li>
        <li>Axes</li>
        <li>Legend</li>
        <li>Mark style</li>
        <li>Annotations</li>
      </ul>
    </div>
  `;
}

function renderPanel(selection: Selection | null): void {
  if (!panelContainer) return;

  if (!selection) {
    renderEmpty();
    return;
  }

  switch (selection.objectType) {
    case "chart":
      renderChartPanel(panelContainer);
      break;
    case "axis-x":
      renderAxisPanel(panelContainer, "x");
      break;
    case "axis-y":
      renderAxisPanel(panelContainer, "y");
      break;
    case "legend":
      renderLegendPanel(panelContainer);
      break;
    case "mark":
      renderMarkPanel(panelContainer);
      break;
    case "annotation":
      renderAnnotationPanel(panelContainer);
      break;
    default:
      renderEmpty();
  }
}

export function initPanel(container: HTMLElement): void {
  panelContainer = container;
  renderEmpty();

  state.subscribe("selection-changed", (sel) => {
    renderPanel(sel as Selection | null);
  });

  // Also re-render panel after mutations to reflect new values
  state.subscribe("mutation-applied", () => {
    if (state.selection) {
      renderPanel(state.selection);
    }
  });
}
