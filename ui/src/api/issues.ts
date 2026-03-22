import type {
  Approval,
  DocumentRevision,
  Issue,
  IssueAttachment,
  IssueComment,
  IssueDocument,
  IssueLabel,
  UpsertIssueDocument,
} from "@paperclipai/shared";
import { api } from "./client";
import { withQueryString } from "./query";

export const issuesApi = {
  list: (
    companyId: string,
    filters?: {
      status?: string;
      projectId?: string;
      assigneeAgentId?: string;
      assigneeUserId?: string;
      touchedByUserId?: string;
      unreadForUserId?: string;
      labelId?: string;
      q?: string;
    },
  ) => {
    return api.get<Issue[]>(
      withQueryString(`/companies/${companyId}/issues`, {
        status: filters?.status,
        projectId: filters?.projectId,
        assigneeAgentId: filters?.assigneeAgentId,
        assigneeUserId: filters?.assigneeUserId,
        touchedByUserId: filters?.touchedByUserId,
        unreadForUserId: filters?.unreadForUserId,
        labelId: filters?.labelId,
        q: filters?.q,
      }),
    );
  },
  listLabels: (companyId: string) => api.get<IssueLabel[]>(`/companies/${companyId}/labels`),
  createLabel: (companyId: string, data: { name: string; color: string }) =>
    api.post<IssueLabel>(`/companies/${companyId}/labels`, data),
  deleteLabel: (id: string) => api.delete<IssueLabel>(`/labels/${id}`),
  get: (id: string) => api.get<Issue>(`/issues/${id}`),
  markRead: (id: string) => api.post<{ id: string; lastReadAt: Date }>(`/issues/${id}/read`, {}),
  create: (companyId: string, data: Record<string, unknown>) =>
    api.post<Issue>(`/companies/${companyId}/issues`, data),
  update: (id: string, data: Record<string, unknown>) => api.patch<Issue>(`/issues/${id}`, data),
  remove: (id: string) => api.delete<Issue>(`/issues/${id}`),
  checkout: (id: string, agentId: string) =>
    api.post<Issue>(`/issues/${id}/checkout`, {
      agentId,
      expectedStatuses: ["todo", "backlog", "blocked"],
    }),
  release: (id: string) => api.post<Issue>(`/issues/${id}/release`, {}),
  listComments: (id: string) => api.get<IssueComment[]>(`/issues/${id}/comments`),
  addComment: (id: string, body: string, reopen?: boolean, interrupt?: boolean) =>
    api.post<IssueComment>(
      `/issues/${id}/comments`,
      {
        body,
        ...(reopen === undefined ? {} : { reopen }),
        ...(interrupt === undefined ? {} : { interrupt }),
      },
    ),
  listDocuments: (id: string) => api.get<IssueDocument[]>(`/issues/${id}/documents`),
  getDocument: (id: string, key: string) => api.get<IssueDocument>(`/issues/${id}/documents/${encodeURIComponent(key)}`),
  upsertDocument: (id: string, key: string, data: UpsertIssueDocument) =>
    api.put<IssueDocument>(`/issues/${id}/documents/${encodeURIComponent(key)}`, data),
  listDocumentRevisions: (id: string, key: string) =>
    api.get<DocumentRevision[]>(`/issues/${id}/documents/${encodeURIComponent(key)}/revisions`),
  deleteDocument: (id: string, key: string) =>
    api.delete<{ ok: true }>(`/issues/${id}/documents/${encodeURIComponent(key)}`),
  listAttachments: (id: string) => api.get<IssueAttachment[]>(`/issues/${id}/attachments`),
  uploadAttachment: (
    companyId: string,
    issueId: string,
    file: File,
    issueCommentId?: string | null,
  ) => {
    const form = new FormData();
    form.append("file", file);
    if (issueCommentId) {
      form.append("issueCommentId", issueCommentId);
    }
    return api.postForm<IssueAttachment>(`/companies/${companyId}/issues/${issueId}/attachments`, form);
  },
  deleteAttachment: (id: string) => api.delete<{ ok: true }>(`/attachments/${id}`),
  listApprovals: (id: string) => api.get<Approval[]>(`/issues/${id}/approvals`),
  linkApproval: (id: string, approvalId: string) =>
    api.post<Approval[]>(`/issues/${id}/approvals`, { approvalId }),
  unlinkApproval: (id: string, approvalId: string) =>
    api.delete<{ ok: true }>(`/issues/${id}/approvals/${approvalId}`),
};
