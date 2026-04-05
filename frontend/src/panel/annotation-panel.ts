/**
 * Property panel for annotations: add, edit, remove text annotations.
 */
import { dispatchAddAnnotation, dispatchRemoveAnnotation } from "../mutation";
import { state } from "../state";
import { row, sectionHeader, textInput, numberInput, colorInput } from "./helpers";

interface AnnotationInfo {
  id: string;
  text: string;
  color: string;
  fontSize: number;
}

function getAnnotations(): AnnotationInfo[] {
  const spec = state.spec;
  if (!spec || !spec["layer"]) return [];

  const layers = spec["layer"] as Record<string, unknown>[];
  const annotations: AnnotationInfo[] = [];

  for (const layer of layers) {
    const editorMeta = (layer["usermeta"] as Record<string, unknown>)?.["editor"] as
      | Record<string, unknown>
      | undefined;
    const annId = editorMeta?.["annotation_id"] as string | undefined;
    if (!annId) continue;

    const mark = layer["mark"] as Record<string, unknown> | undefined;
    const encoding = layer["encoding"] as Record<string, unknown> | undefined;
    const textEnc = encoding?.["text"] as Record<string, unknown> | undefined;

    annotations.push({
      id: annId,
      text: (textEnc?.["value"] as string) ?? "",
      color: (mark?.["color"] as string) ?? "black",
      fontSize: (mark?.["fontSize"] as number) ?? 14,
    });
  }

  return annotations;
}

export function renderAnnotationPanel(container: HTMLElement): void {
  container.innerHTML = "";
  container.appendChild(sectionHeader("Annotations"));

  // Add annotation form
  const addSection = document.createElement("div");
  addSection.className = "panel-add-annotation";

  let newText = "Annotation";
  addSection.appendChild(
    row("Text", textInput(newText, (v) => { newText = v; })),
  );

  const addBtn = document.createElement("button");
  addBtn.className = "panel-btn";
  addBtn.textContent = "Add Annotation";
  addBtn.addEventListener("click", () => {
    dispatchAddAnnotation({ text: newText });
  });
  addSection.appendChild(addBtn);
  container.appendChild(addSection);

  // List existing annotations
  const annotations = getAnnotations();
  if (annotations.length > 0) {
    const listHeader = document.createElement("h4");
    listHeader.className = "panel-subsection";
    listHeader.textContent = "Existing";
    container.appendChild(listHeader);
  }

  for (const ann of annotations) {
    const annDiv = document.createElement("div");
    annDiv.className = "panel-annotation-item";

    const label = document.createElement("span");
    label.className = "panel-annotation-label";
    label.textContent = ann.text.length > 20 ? ann.text.slice(0, 20) + "..." : ann.text;
    annDiv.appendChild(label);

    const removeBtn = document.createElement("button");
    removeBtn.className = "panel-btn panel-btn-danger";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      dispatchRemoveAnnotation(ann.id);
    });
    annDiv.appendChild(removeBtn);

    container.appendChild(annDiv);
  }
}
