import { api } from "./client";

export interface Artifact {
  id: string;
  companyId: string;
  issueId: string | null;
  runId: string | null;
  agentId: string | null;
  kind: string;
  title: string;
  mimeType: string | null;
  filename: string | null;
  sizeBytes: number | null;
  storageKind: string;
  contentPath: string | null;
  previewUrl: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export const artifactsApi = {
  listByCompany: (companyId: string) =>
    api.get<Artifact[]>(`/companies/${companyId}/artifacts`),

  listByIssue: (issueId: string) =>
    api.get<Artifact[]>(`/issues/${issueId}/artifacts`),

  get: (id: string) =>
    api.get<Artifact>(`/artifacts/${id}`),

  upload: (issueId: string, companyId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("companyId", companyId);
    return api.postForm<Artifact>(`/issues/${issueId}/artifacts`, formData);
  },

  delete: (id: string) =>
    api.delete<{ ok: true }>(`/artifacts/${id}`),

  downloadUrl: (id: string) => `/api/artifacts/${id}/download`,
};
