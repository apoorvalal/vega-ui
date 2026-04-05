/**
 * HTTP client for the Vega-UI backend API.
 */
import type {
  AnnotationAdd,
  AnnotationRemove,
  ChartSession,
  ExportResponse,
  MutationRequest,
  MutationResult,
  VegaLiteSpec,
} from "./types";

const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`API error ${resp.status}: ${detail}`);
  }
  return resp.json() as Promise<T>;
}

export async function createChart(spec: VegaLiteSpec): Promise<ChartSession> {
  return request<ChartSession>("/charts", {
    method: "POST",
    body: JSON.stringify({ spec }),
  });
}

export async function getChart(id: string): Promise<ChartSession> {
  return request<ChartSession>(`/charts/${id}`);
}

export async function mutateChart(
  id: string,
  mutations: MutationRequest[],
): Promise<MutationResult> {
  return request<MutationResult>(`/charts/${id}/mutate`, {
    method: "POST",
    body: JSON.stringify({ mutations }),
  });
}

export async function undoChart(id: string): Promise<MutationResult> {
  return request<MutationResult>(`/charts/${id}/undo`, {
    method: "POST",
  });
}

export async function addAnnotation(
  id: string,
  annotation: AnnotationAdd,
): Promise<MutationResult> {
  return request<MutationResult>(`/charts/${id}/annotations/add`, {
    method: "POST",
    body: JSON.stringify(annotation),
  });
}

export async function removeAnnotation(
  id: string,
  body: AnnotationRemove,
): Promise<MutationResult> {
  return request<MutationResult>(`/charts/${id}/annotations/remove`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function exportJson(id: string): Promise<ExportResponse> {
  return request<ExportResponse>(`/charts/${id}/export/json`);
}

export async function exportPython(id: string): Promise<ExportResponse> {
  return request<ExportResponse>(`/charts/${id}/export/python`);
}
