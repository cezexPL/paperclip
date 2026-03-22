import type { CostSummary, CostByAgent } from "@paperclipai/shared";
import { api } from "./client";
import { withQueryString } from "./query";

export interface CostByProject {
  projectId: string | null;
  projectName: string | null;
  costCents: number;
  inputTokens: number;
  outputTokens: number;
}

export const costsApi = {
  summary: (companyId: string, from?: string, to?: string) =>
    api.get<CostSummary>(withQueryString(`/companies/${companyId}/costs/summary`, { from, to })),
  byAgent: (companyId: string, from?: string, to?: string) =>
    api.get<CostByAgent[]>(withQueryString(`/companies/${companyId}/costs/by-agent`, { from, to })),
  byProject: (companyId: string, from?: string, to?: string) =>
    api.get<CostByProject[]>(withQueryString(`/companies/${companyId}/costs/by-project`, { from, to })),
};
