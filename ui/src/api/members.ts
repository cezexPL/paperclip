import type { MembershipRole } from "@paperclipai/shared";
import { api } from "./client";

export type CompanyMember = {
  id: string;
  companyId: string;
  principalType: "user" | "agent";
  principalId: string;
  status: string;
  membershipRole: string | null;
  email: string | null;
  name: string | null;
  createdAt: string;
  updatedAt: string;
};

export const membersApi = {
  list: (companyId: string) =>
    api.get<CompanyMember[]>(`/companies/${companyId}/members`),

  add: (companyId: string, userId: string, role: MembershipRole) =>
    api.post<CompanyMember>(`/companies/${companyId}/members`, { userId, role }),

  updateRole: (companyId: string, userId: string, role: MembershipRole) =>
    api.patch<CompanyMember>(`/companies/${companyId}/members/${userId}/role`, { role }),

  remove: (companyId: string, userId: string) =>
    api.delete<{ ok: true }>(`/companies/${companyId}/members/${userId}`),
};
