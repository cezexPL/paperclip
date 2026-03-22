import type {
  HeartbeatRun,
  HeartbeatRunEvent,
  InstanceSchedulerHeartbeatAgent,
} from "@paperclipai/shared";
import { api } from "./client";
import { withQueryString } from "./query";

export interface ActiveRunForIssue extends HeartbeatRun {
  agentId: string;
  agentName: string;
  adapterType: string;
}

export interface LiveRunForIssue {
  id: string;
  status: string;
  invocationSource: string;
  triggerDetail: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  agentId: string;
  agentName: string;
  adapterType: string;
  issueId?: string | null;
}

export const heartbeatsApi = {
  list: (companyId: string, agentId?: string, limit?: number) => {
    return api.get<HeartbeatRun[]>(
      withQueryString(`/companies/${companyId}/heartbeat-runs`, {
        agentId: agentId || undefined,
        limit: limit || undefined,
      }),
    );
  },
  get: (runId: string) => api.get<HeartbeatRun>(`/heartbeat-runs/${runId}`),
  events: (runId: string, afterSeq = 0, limit = 200) =>
    api.get<HeartbeatRunEvent[]>(
      withQueryString(`/heartbeat-runs/${runId}/events`, { afterSeq, limit }),
    ),
  log: (runId: string, offset = 0, limitBytes = 256000) =>
    api.get<{ runId: string; store: string; logRef: string; content: string; nextOffset?: number }>(
      withQueryString(`/heartbeat-runs/${runId}/log`, { offset, limitBytes }),
    ),
  cancel: (runId: string) => api.post<void>(`/heartbeat-runs/${runId}/cancel`, {}),
  liveRunsForIssue: (issueId: string) =>
    api.get<LiveRunForIssue[]>(`/issues/${issueId}/live-runs`),
  activeRunForIssue: (issueId: string) =>
    api.get<ActiveRunForIssue | null>(`/issues/${issueId}/active-run`),
  liveRunsForCompany: (companyId: string, minCount?: number) =>
    api.get<LiveRunForIssue[]>(withQueryString(`/companies/${companyId}/live-runs`, { minCount: minCount || undefined })),
  listInstanceSchedulerAgents: () =>
    api.get<InstanceSchedulerHeartbeatAgent[]>("/instance/scheduler-heartbeats"),
};
