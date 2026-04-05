/**
 * DOM helper utilities for building property panels.
 */

/** Get a nested value from a spec using dot-path. */
export function getFromSpec(spec: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = spec;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** Create a labeled input row. */
export function row(label: string, input: HTMLElement): HTMLDivElement {
  const div = document.createElement("div");
  div.className = "panel-row";

  const lbl = document.createElement("label");
  lbl.textContent = label;
  lbl.className = "panel-label";

  div.appendChild(lbl);
  div.appendChild(input);
  return div;
}

/** Create a text input. */
export function textInput(
  value: string,
  onChange: (val: string) => void,
): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "panel-input";
  input.value = value;
  input.addEventListener("change", () => onChange(input.value));
  return input;
}

/** Create a number input. */
export function numberInput(
  value: number | undefined,
  onChange: (val: number) => void,
  opts?: { min?: number; max?: number; step?: number },
): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "number";
  input.className = "panel-input";
  if (value !== undefined) input.value = String(value);
  if (opts?.min !== undefined) input.min = String(opts.min);
  if (opts?.max !== undefined) input.max = String(opts.max);
  if (opts?.step !== undefined) input.step = String(opts.step);
  input.addEventListener("change", () => onChange(Number(input.value)));
  return input;
}

/** Create a color input. */
export function colorInput(
  value: string,
  onChange: (val: string) => void,
): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "color";
  input.className = "panel-color";
  input.value = value || "#000000";
  input.addEventListener("input", () => onChange(input.value));
  return input;
}

/** Create a checkbox input. */
export function checkboxInput(
  value: boolean,
  onChange: (val: boolean) => void,
): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "panel-checkbox";
  input.checked = value;
  input.addEventListener("change", () => onChange(input.checked));
  return input;
}

/** Create a select dropdown. */
export function selectInput(
  value: string,
  options: string[],
  onChange: (val: string) => void,
): HTMLSelectElement {
  const select = document.createElement("select");
  select.className = "panel-select";
  for (const opt of options) {
    const option = document.createElement("option");
    option.value = opt;
    option.textContent = opt;
    if (opt === value) option.selected = true;
    select.appendChild(option);
  }
  select.addEventListener("change", () => onChange(select.value));
  return select;
}

/** Create a range slider. */
export function rangeInput(
  value: number,
  onChange: (val: number) => void,
  opts: { min: number; max: number; step: number },
): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "range";
  input.className = "panel-range";
  input.min = String(opts.min);
  input.max = String(opts.max);
  input.step = String(opts.step);
  input.value = String(value);
  input.addEventListener("input", () => onChange(Number(input.value)));
  return input;
}

/** Create a section header. */
export function sectionHeader(text: string): HTMLHeadingElement {
  const h = document.createElement("h3");
  h.className = "panel-section";
  h.textContent = text;
  return h;
}
