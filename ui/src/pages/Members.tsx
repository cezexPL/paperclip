import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Users, Copy, Check, Trash2, Shield } from "lucide-react";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type MemberRow = {
  id: string;
  companyId: string;
  principalType: string;
  principalId: string;
  status: string;
  membershipRole: string | null;
  invitedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
};

type InviteRow = {
  id: string;
  companyId: string;
  token: string;
  role: string;
  createdByUserId: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  acceptedByUserId: string | null;
  createdAt: string;
};

const ROLES = ["owner", "admin", "operator", "viewer"] as const;

function membersKeys(companyId: string) {
  return ["members", companyId] as const;
}
function memberInvitesKeys(companyId: string) {
  return ["member-invites", companyId] as const;
}

export function Members() {
  const { t } = useTranslation();
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<string>("operator");
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setBreadcrumbs([{ label: t("members.title") }]);
  }, [setBreadcrumbs, t]);

  const { data: members, isLoading } = useQuery({
    queryKey: membersKeys(selectedCompanyId!),
    queryFn: () => api.get<MemberRow[]>(`/companies/${selectedCompanyId}/members`),
    enabled: !!selectedCompanyId,
  });

  const { data: invites } = useQuery({
    queryKey: memberInvitesKeys(selectedCompanyId!),
    queryFn: () => api.get<InviteRow[]>(`/companies/${selectedCompanyId}/members/invites`),
    enabled: !!selectedCompanyId,
  });

  const createInviteMut = useMutation({
    mutationFn: (role: string) =>
      api.post<InviteRow>(`/companies/${selectedCompanyId}/members/invites`, { role }),
    onSuccess: (data) => {
      setInviteToken(data.token);
      queryClient.invalidateQueries({ queryKey: memberInvitesKeys(selectedCompanyId!) });
    },
  });

  const updateRoleMut = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      api.patch(`/companies/${selectedCompanyId}/members/${memberId}`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKeys(selectedCompanyId!) });
    },
  });

  const removeMemberMut = useMutation({
    mutationFn: (memberId: string) =>
      api.delete(`/companies/${selectedCompanyId}/members/${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKeys(selectedCompanyId!) });
    },
  });

  if (!selectedCompanyId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">{t("members.selectCompany")}</div>
    );
  }

  if (isLoading) {
    return <PageSkeleton />;
  }

  function handleCreateInvite() {
    setInviteToken(null);
    setCopied(false);
    createInviteMut.mutate(inviteRole);
  }

  function copyInviteLink() {
    if (!inviteToken) return;
    const url = `${window.location.origin}/invite/collab/${inviteToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function roleLabel(role: string) {
    return t(`members.${role}` as const, role);
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">{t("members.title")}</h1>
        </div>
        <Button size="sm" onClick={() => setInviteOpen(true)}>
          {t("members.invite")}
        </Button>
      </div>

      {/* Members list */}
      {!members?.length ? (
        <EmptyState icon={Users} message={t("members.noMembers")} />
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-3 px-4 py-3">
              {member.userImage ? (
                <img
                  src={member.userImage}
                  alt=""
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                  {(member.userName ?? member.userEmail ?? "?")[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {member.userName ?? member.principalId}
                </div>
                {member.userEmail && (
                  <div className="text-xs text-muted-foreground truncate">
                    {member.userEmail}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={member.membershipRole ?? "operator"}
                  onValueChange={(role) =>
                    updateRoleMut.mutate({ memberId: member.id, role })
                  }
                >
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {roleLabel(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (confirm(t("members.removeConfirm"))) {
                      removeMemberMut.mutate(member.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending invites */}
      {invites && invites.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t("members.invite")}
          </h2>
          <div className="rounded-lg border border-border divide-y divide-border">
            {invites.map((inv) => {
              const isExpired = new Date(inv.expiresAt) < new Date();
              const isAccepted = !!inv.acceptedAt;
              return (
                <div key={inv.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{roleLabel(inv.role)}</span>
                    <span className="text-muted-foreground ml-2">
                      {isAccepted
                        ? t("members.accepted")
                        : isExpired
                          ? t("members.expired")
                          : t("members.pending")}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("members.invite")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">{t("members.inviteRole")}</label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {inviteToken ? (
              <div>
                <p className="text-sm text-muted-foreground mb-2">{t("members.inviteDesc")}</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={`${window.location.origin}/invite/collab/${inviteToken}`}
                    className="flex-1 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs font-mono"
                  />
                  <Button variant="outline" size="sm" onClick={copyInviteLink}>
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied ? t("members.copied") : t("members.copyLink")}
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={handleCreateInvite} disabled={createInviteMut.isPending}>
                {t("members.invite")}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
