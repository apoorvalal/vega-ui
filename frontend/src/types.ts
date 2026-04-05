/** Vega-Lite spec (loosely typed -- the backend validates). */
export type VegaLiteSpec = Record<string, unknown>;

/** Supported editable object types in the editor. */
export type ObjectType =
  | "chart"
  | "axis-x"
  | "axis-y"
  | "legend"
  | "mark"
  | "annotation";

/** Represents a user selection in the editor. */
export interface Selection {
  objectType: ObjectType;
  objectId: string;
}

/** Chart session returned by the backend. */
export interface ChartSession {
  id: string;
  spec: VegaLiteSpec;
  supported_objects: string[];
}

/** A single mutation to send to the backend. */
export interface MutationRequest {
  target: string;
  value: unknown;
}

/** Batch of mutations. */
export interface MutationBatch {
  mutations: MutationRequest[];
}

/** Result of applying mutations. */
export interface MutationResult {
  spec: VegaLiteSpec;
  valid: boolean;
  errors: string[];
}

/** Export response from the backend. */
export interface ExportResponse {
  format: "json" | "python";
  content: string;
}

/** Annotation add request. */
export interface AnnotationAdd {
  text: string;
  x_value?: unknown;
  y_value?: unknown;
  color?: string;
  font_size?: number;
}

/** Annotation remove request. */
export interface AnnotationRemove {
  annotation_id: string;
}
