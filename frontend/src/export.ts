/**
 * Export UI: buttons and modal for exporting chart as JSON or Python.
 */
import { exportJson, exportPython } from "./api";
import { state } from "./state";

let modal: HTMLElement | null = null;

function createModal(): HTMLElement {
  const overlay = document.createElement("div");
  overlay.className = "export-overlay";
  overlay.innerHTML = `
    <div class="export-modal">
      <div class="export-header">
        <h3 class="export-title"></h3>
        <button class="export-close">&times;</button>
      </div>
      <pre class="export-content"><code></code></pre>
      <button class="export-copy panel-btn">Copy to clipboard</button>
    </div>
  `;

  overlay.querySelector(".export-close")!.addEventListener("click", () => {
    overlay.classList.remove("visible");
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("visible");
  });
  overlay.querySelector(".export-copy")!.addEventListener("click", () => {
    const code = overlay.querySelector("code")!.textContent ?? "";
    navigator.clipboard.writeText(code).then(() => {
      const btn = overlay.querySelector(".export-copy") as HTMLButtonElement;
      btn.textContent = "Copied";
      setTimeout(() => { btn.textContent = "Copy to clipboard"; }, 1500);
    });
  });

  document.body.appendChild(overlay);
  return overlay;
}

function showExport(title: string, content: string): void {
  if (!modal) modal = createModal();
  modal.querySelector(".export-title")!.textContent = title;
  modal.querySelector("code")!.textContent = content;
  modal.classList.add("visible");
}

export function initExport(toolbar: HTMLElement): void {
  const jsonBtn = document.createElement("button");
  jsonBtn.className = "toolbar-btn";
  jsonBtn.textContent = "Export JSON";
  jsonBtn.addEventListener("click", async () => {
    const sid = state.sessionId;
    if (!sid) return;
    try {
      const resp = await exportJson(sid);
      showExport("Vega-Lite JSON", resp.content);
    } catch (err) {
      console.error("Export JSON failed:", err);
    }
  });

  const pyBtn = document.createElement("button");
  pyBtn.className = "toolbar-btn";
  pyBtn.textContent = "Export Python";
  pyBtn.addEventListener("click", async () => {
    const sid = state.sessionId;
    if (!sid) return;
    try {
      const resp = await exportPython(sid);
      showExport("Python Code", resp.content);
    } catch (err) {
      console.error("Export Python failed:", err);
    }
  });

  toolbar.appendChild(jsonBtn);
  toolbar.appendChild(pyBtn);
}
