/**
 * Application entry point.
 */
import { createChart } from "./api";
import { initRenderer } from "./renderer";
import { initSelection } from "./selection";
import { initPanel } from "./panel/panel";
import { initExport } from "./export";
import { dispatchUndo } from "./mutation";
import { state } from "./state";
import "./styles.css";

const SAMPLE_SPEC = {
  $schema: "https://vega.github.io/schema/vega-lite/v5.json",
  data: {
    values: [
      { category: "A", value: 28 },
      { category: "B", value: 55 },
      { category: "C", value: 43 },
      { category: "D", value: 91 },
      { category: "E", value: 81 },
      { category: "F", value: 53 },
    ],
  },
  mark: "bar",
  encoding: {
    x: { field: "category", type: "nominal" },
    y: { field: "value", type: "quantitative" },
  },
};

async function loadChart(spec: Record<string, unknown>): Promise<void> {
  try {
    const session = await createChart(spec);
    state.setSession(session);
  } catch (err) {
    console.error("Failed to create chart session:", err);
    const chartArea = document.getElementById("chart-container");
    if (chartArea) {
      chartArea.innerHTML = `<p class="error">Failed to load chart: ${err}</p>`;
    }
  }
}

function initLoadForm(): void {
  const loadArea = document.getElementById("load-area")!;
  const textarea = document.createElement("textarea");
  textarea.className = "load-textarea";
  textarea.placeholder = "Paste Vega-Lite JSON here...";
  textarea.value = JSON.stringify(SAMPLE_SPEC, null, 2);

  const loadBtn = document.createElement("button");
  loadBtn.className = "toolbar-btn";
  loadBtn.textContent = "Load Chart";
  loadBtn.addEventListener("click", () => {
    try {
      const spec = JSON.parse(textarea.value);
      loadChart(spec);
      loadArea.classList.add("hidden");
    } catch (err) {
      alert(`Invalid JSON: ${err}`);
    }
  });

  const sampleBtn = document.createElement("button");
  sampleBtn.className = "toolbar-btn";
  sampleBtn.textContent = "Load Sample";
  sampleBtn.addEventListener("click", () => {
    loadChart(SAMPLE_SPEC);
    loadArea.classList.add("hidden");
  });

  loadArea.appendChild(textarea);
  const btnRow = document.createElement("div");
  btnRow.className = "load-buttons";
  btnRow.appendChild(loadBtn);
  btnRow.appendChild(sampleBtn);
  loadArea.appendChild(btnRow);
}

function init(): void {
  const chartContainer = document.getElementById("chart-container")!;
  const panelContainer = document.getElementById("property-panel")!;
  const toolbar = document.getElementById("toolbar")!;

  initRenderer(chartContainer);
  initSelection(chartContainer);
  initPanel(panelContainer);
  initExport(toolbar);
  initLoadForm();

  // Undo button
  const undoBtn = document.createElement("button");
  undoBtn.className = "toolbar-btn";
  undoBtn.textContent = "Undo";
  undoBtn.addEventListener("click", () => dispatchUndo());
  toolbar.prepend(undoBtn);

  // Annotation panel button
  const annBtn = document.createElement("button");
  annBtn.className = "toolbar-btn";
  annBtn.textContent = "Annotations";
  annBtn.addEventListener("click", () => {
    state.setSelection({ objectType: "annotation", objectId: "annotation" });
  });
  toolbar.appendChild(annBtn);

  // Error display
  state.subscribe("error", (err) => {
    const errDiv = document.getElementById("error-bar")!;
    errDiv.textContent = err as string;
    errDiv.classList.add("visible");
    setTimeout(() => errDiv.classList.remove("visible"), 4000);
  });
}

document.addEventListener("DOMContentLoaded", init);
