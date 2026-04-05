const state = {
  document: null,
  selectedObjectId: null,
};

const elements = {
  feedback: document.getElementById("feedback"),
  loadSpec: document.getElementById("load-spec"),
  resetExample: document.getElementById("reset-example"),
  supportBanner: document.getElementById("support-banner"),
  specInput: document.getElementById("spec-input"),
  objectList: document.getElementById("object-list"),
  propertyEditor: document.getElementById("property-editor"),
  previewImage: document.getElementById("preview-image"),
  specOutput: document.getElementById("spec-output"),
  pythonOutput: document.getElementById("python-output"),
  downloadJson: document.getElementById("download-json"),
  downloadPython: document.getElementById("download-python"),
  textAnnotationForm: document.getElementById("text-annotation-form"),
  ruleAnnotationForm: document.getElementById("rule-annotation-form"),
};

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.detail || "Request failed.";
    const context = payload.context ? ` ${payload.context}` : "";
    throw new Error(`${detail}${context}`);
  }
  return payload;
}

function setFeedback(message, tone = "neutral") {
  elements.feedback.textContent = message;
  elements.feedback.className = `feedback ${tone === "neutral" ? "" : tone}`.trim();
}

function applyDocument(documentPayload, preserveSelection = true) {
  state.document = documentPayload;
  const objectIds = documentPayload.objects.map((item) => item.id);

  if (!preserveSelection || !objectIds.includes(state.selectedObjectId)) {
    state.selectedObjectId = objectIds[0] || null;
  }

  render();
}

function selectedObject() {
  if (!state.document || !state.selectedObjectId) {
    return null;
  }
  return state.document.objects.find((item) => item.id === state.selectedObjectId) || null;
}

function renderSupport() {
  elements.supportBanner.replaceChildren();
  if (!state.document) {
    return;
  }

  const supportState = document.createElement("div");
  supportState.className = `support-state ${state.document.support.mode}`;
  supportState.textContent =
    state.document.support.mode === "editable"
      ? "Editable subset detected"
      : "Preview-only chart";
  elements.supportBanner.appendChild(supportState);

  for (const warning of state.document.support.warnings) {
    const warningNode = document.createElement("div");
    warningNode.className = "warning-item";
    warningNode.textContent = warning;
    elements.supportBanner.appendChild(warningNode);
  }
}

function renderObjectList() {
  elements.objectList.replaceChildren();
  if (!state.document || state.document.objects.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No editable objects are available for this chart.";
    elements.objectList.appendChild(empty);
    return;
  }

  for (const item of state.document.objects) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `object-button ${item.id === state.selectedObjectId ? "selected" : ""}`.trim();
    button.addEventListener("click", () => {
      state.selectedObjectId = item.id;
      renderPropertyEditor();
      renderObjectList();
    });

    const title = document.createElement("strong");
    title.textContent = item.label;
    button.appendChild(title);

    const description = document.createElement("span");
    description.textContent = item.description;
    button.appendChild(description);

    elements.objectList.appendChild(button);
  }
}

function buildFieldInput(field) {
  let input;
  if (field.control === "select") {
    input = document.createElement("select");
    for (const option of field.options) {
      const optionNode = document.createElement("option");
      optionNode.value = option.value;
      optionNode.textContent = option.label;
      if (option.value === field.value) {
        optionNode.selected = true;
      }
      input.appendChild(optionNode);
    }
  } else if (field.control === "textarea") {
    input = document.createElement("textarea");
    input.value = field.value ?? "";
  } else {
    input = document.createElement("input");
    input.type = field.control === "number" ? "number" : field.control === "checkbox" ? "checkbox" : "text";
    if (field.control === "checkbox") {
      input.checked = Boolean(field.value);
    } else {
      input.value = field.value ?? "";
    }
  }

  input.name = field.name;
  input.disabled = Boolean(field.disabled);

  if (field.placeholder && "placeholder" in input) {
    input.placeholder = field.placeholder;
  }
  if (field.min !== null && field.min !== undefined) {
    input.min = String(field.min);
  }
  if (field.max !== null && field.max !== undefined) {
    input.max = String(field.max);
  }
  if (field.step !== null && field.step !== undefined) {
    input.step = String(field.step);
  }

  return input;
}

function renderPropertyEditor() {
  elements.propertyEditor.replaceChildren();

  if (!state.document) {
    return;
  }

  if (state.document.support.mode !== "editable") {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "This chart is preview-only. Load a supported Stage A spec to enable mutations.";
    elements.propertyEditor.appendChild(empty);
    return;
  }

  const item = selectedObject();
  if (!item) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Select an object to edit its supported properties.";
    elements.propertyEditor.appendChild(empty);
    return;
  }

  const form = document.createElement("form");
  form.className = "property-form";
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const changes = {};
    for (const field of item.fields) {
      const input = form.elements.namedItem(field.name);
      if (!input) {
        continue;
      }
      if (field.control === "checkbox") {
        changes[field.name] = input.checked;
      } else if (field.control === "number") {
        changes[field.name] = input.value === "" ? null : Number(input.value);
      } else {
        changes[field.name] = input.value;
      }
    }

    try {
      setFeedback(`Saving ${item.label.toLowerCase()} changes...`);
      const updated = await requestJson("/api/mutate", {
        method: "POST",
        body: JSON.stringify({
          spec: state.document.spec,
          object_id: item.id,
          changes,
        }),
      });
      applyDocument(updated, true);
      setFeedback(`${item.label} updated.`, "success");
    } catch (error) {
      setFeedback(error.message, "error");
    }
  });

  for (const field of item.fields) {
    const wrapper = document.createElement("div");
    wrapper.className = `property-field ${field.control === "checkbox" ? "checkbox-row" : ""}`.trim();

    const input = buildFieldInput(field);
    const label = document.createElement("label");
    label.className = "field-label";
    label.htmlFor = `${item.id}-${field.name}`;
    label.textContent = field.label;
    input.id = `${item.id}-${field.name}`;

    if (field.control === "checkbox") {
      wrapper.appendChild(input);
      wrapper.appendChild(label);
    } else {
      wrapper.appendChild(label);
      wrapper.appendChild(input);
    }

    if (field.help_text) {
      const help = document.createElement("small");
      help.textContent = field.help_text;
      wrapper.appendChild(help);
    }

    form.appendChild(wrapper);
  }

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "button primary";
  submit.textContent = "Apply Changes";
  form.appendChild(submit);

  elements.propertyEditor.appendChild(form);
}

function render() {
  if (!state.document) {
    return;
  }

  elements.specInput.value = state.document.spec_json;
  elements.specOutput.value = state.document.spec_json;
  elements.pythonOutput.value = state.document.python_code;
  elements.previewImage.src = state.document.preview_data_url;

  const annotationsDisabled = state.document.support.mode !== "editable";
  for (const form of [elements.textAnnotationForm, elements.ruleAnnotationForm]) {
    for (const control of form.elements) {
      if (control.tagName === "BUTTON") {
        control.disabled = annotationsDisabled;
      } else if (control.name) {
        control.disabled = annotationsDisabled;
      }
    }
  }

  renderSupport();
  renderObjectList();
  renderPropertyEditor();
}

async function loadExample() {
  try {
    setFeedback("Loading example chart...");
    const payload = await requestJson("/api/example");
    applyDocument(payload, false);
    setFeedback("Example chart loaded.", "success");
  } catch (error) {
    setFeedback(error.message, "error");
  }
}

async function handleLoadSpec() {
  try {
    setFeedback("Loading spec...");
    const payload = await requestJson("/api/load", {
      method: "POST",
      body: JSON.stringify({ spec_text: elements.specInput.value }),
    });
    applyDocument(payload, false);
    setFeedback("Chart loaded.", "success");
  } catch (error) {
    setFeedback(error.message, "error");
  }
}

async function handleTextAnnotation(event) {
  event.preventDefault();
  if (!state.document) {
    return;
  }

  const form = new FormData(elements.textAnnotationForm);
  try {
    setFeedback("Adding text annotation...");
    const payload = await requestJson("/api/annotations/text", {
      method: "POST",
      body: JSON.stringify({
        spec: state.document.spec,
        text: form.get("text"),
        x: form.get("x"),
        y: form.get("y"),
        color: form.get("color"),
        font_size: Number(form.get("font_size")),
        align: form.get("align"),
      }),
    });
    applyDocument(payload, true);
    setFeedback("Text annotation added.", "success");
  } catch (error) {
    setFeedback(error.message, "error");
  }
}

async function handleRuleAnnotation(event) {
  event.preventDefault();
  if (!state.document) {
    return;
  }

  const form = new FormData(elements.ruleAnnotationForm);
  try {
    setFeedback("Adding reference line...");
    const payload = await requestJson("/api/annotations/rule", {
      method: "POST",
      body: JSON.stringify({
        spec: state.document.spec,
        axis: form.get("axis"),
        value: form.get("value"),
        label: form.get("label"),
        color: form.get("color"),
        stroke_width: Number(form.get("stroke_width")),
        label_color: form.get("label_color"),
        label_font_size: Number(form.get("label_font_size")),
      }),
    });
    applyDocument(payload, true);
    setFeedback("Reference line added.", "success");
  } catch (error) {
    setFeedback(error.message, "error");
  }
}

function downloadText(filename, contents) {
  const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

elements.loadSpec.addEventListener("click", handleLoadSpec);
elements.resetExample.addEventListener("click", loadExample);
elements.textAnnotationForm.addEventListener("submit", handleTextAnnotation);
elements.ruleAnnotationForm.addEventListener("submit", handleRuleAnnotation);
elements.downloadJson.addEventListener("click", () => {
  if (state.document) {
    downloadText("chart.json", state.document.spec_json);
  }
});
elements.downloadPython.addEventListener("click", () => {
  if (state.document) {
    downloadText("chart.py", state.document.python_code);
  }
});

loadExample();
