import type {
  CompanyFileEntry,
  CompanyFileRevision,
  CompanyFilesOverview,
  CompanyFileTreeNode,
  CreateCompanyDocument,
  CreateCompanyFolder,
  UpdateCompanyDocument,
} from "@paperclipai/shared";
import { api } from "./client";
import { withQueryString } from "./query";

export const filesApi = {
  overview: (companyId: string) =>
    api.get<CompanyFilesOverview>(`/companies/${companyId}/files/overview`),
  list: (
    companyId: string,
    input: { scopeType: "shared" | "agent"; scopeId?: string | null; parentPath?: string | null },
  ) => {
    return api.get<CompanyFileTreeNode[]>(
      withQueryString(`/companies/${companyId}/files`, {
        scopeType: input.scopeType,
        scopeId: input.scopeId,
        parentPath: input.parentPath,
      }),
    );
  },
  createFolder: (companyId: string, body: CreateCompanyFolder) =>
    api.post<CompanyFileEntry>(`/companies/${companyId}/files/folders`, body),
  createDocument: (companyId: string, body: CreateCompanyDocument) =>
    api.post<CompanyFileEntry>(`/companies/${companyId}/files/documents`, body),
  upload: (
    companyId: string,
    file: File,
    input: {
      scopeType: "shared" | "agent";
      scopeId?: string | null;
      parentPath?: string | null;
      linkedIssueId?: string | null;
      linkedProjectId?: string | null;
    },
  ) => {
    const form = new FormData();
    form.append("file", file);
    form.append("scopeType", input.scopeType);
    if (input.scopeId) form.append("scopeId", input.scopeId);
    if (input.parentPath) form.append("parentPath", input.parentPath);
    if (input.linkedIssueId) form.append("linkedIssueId", input.linkedIssueId);
    if (input.linkedProjectId) form.append("linkedProjectId", input.linkedProjectId);
    return api.postForm<CompanyFileEntry>(`/companies/${companyId}/files/upload`, form);
  },
  get: (fileId: string) => api.get<CompanyFileEntry>(`/files/${fileId}`),
  listRevisions: (fileId: string) => api.get<CompanyFileRevision[]>(`/files/${fileId}/revisions`),
  updateDocument: (fileId: string, body: UpdateCompanyDocument) =>
    api.put<CompanyFileEntry>(`/files/${fileId}/document`, body),
  remove: (fileId: string) => api.delete<{ ok: true }>(`/files/${fileId}`),
  listForIssue: (issueId: string) => api.get<CompanyFileEntry[]>(`/issues/${issueId}/files`),
};
