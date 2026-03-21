import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { membersApi, type CompanyMember } from "../api/members";
import { accessApi } from "../api/access";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "../components/PageSkeleton";
import {
  Users,
  UserPlus,
  Trash2,
  Link as LinkIcon,
  Copy,
  Check,
  ChevronDown,
} from "lucide-react";
import type { MembershipRole } from "@paperclipai/shared";
import { MEMBERSHIP_ROLES } from "@paperclipai/shared";
import { formatDate } from "../lib/utils";

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  operator: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  viewer: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const ROLE_LABEL_KEYS: Record<string, string> = {
  owner: "members.roleOwner",
  admin: "members.roleAdmin",
  operator: "members.roleOperator",
  viewer: "members.roleViewer",
};

function RoleBadge({ role }: { role: string | null }) {
  const { t } = useTranslation();
  const key = role ?? "viewer";
  const label = t(ROLE_LABEL_KEYS[key] ?? ROLE_LABEL_KEYS.viewer!);
  const color = ROLE_COLORS[key] ?? ROLE_COLORS.viewer;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

function RoleDropdown({
  currentRole,
  onSelect,
  disabled,
}: {
  currentRole: string | null;
  onSelect: (role: MembershipRole) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="gap-1 text-xs"
      >
        {t(ROLE_LABEL_KEYS[currentRole ?? "viewer"] ?? ROLE_LABEL_KEYS.viewer!)}
        <ChevronDown className="h-3 w-3" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-40 rounded-md border border-border bg-popover p-1 shadow-md">
            {MEMBERSHIP_ROLES.map((role) => (
              <button
                key={role}
                className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent ${
                  role === currentRole ? "font-semibold" : ""
                }`}
                onClick={() => {
                  onSelect(role);
                  setOpen(false);
                }}
              >
                {role === currentRole && <Check className="h-3 w-3" />}
                {role !== currentRole && <span className="w-3" />}
                {t(ROLE_LABEL_KEYS[role]!)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MemberRow({
  member,
  isOwner,
  onUpdateRole,
  onRemove,
  isPending,
}: {
  member: CompanyMember;
  isOwner: boolean;
  onUpdateRole: (userId: string, role: MembershipRole) => void;
  onRemove: (userId: string) => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  const displayName = member.name || member.email || member.principalId;
  const initial = (member.name ?? member.email ?? "?")[0]?.toUpperCase() ?? "?";
  const typeLabel = member.principalType === "agent" ? t("members.typeAgent") : t("members.typeUser");

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
        {initial}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
        {member.email && member.name && (
          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {typeLabel} &middot; {t("members.joined")} {formatDate(member.createdAt)}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {isOwner && member.principalType === "user" ? (
          <RoleDropdown
            currentRole={member.membershipRole}
            onSelect={(role) => onUpdateRole(member.principalId, role)}
            disabled={isPending}
          />
        ) : (
          <RoleBadge role={member.membershipRole} />
        )}
        {isOwner && member.principalType === "user" && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            disabled={isPending}
            onClick={() => {
              if (window.confirm(t("members.removeConfirm"))) {
                onRemove(member.principalId);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function Members() {
  const { t } = useTranslation();
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();

  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setBreadcrumbs([{ label: t("members.breadcrumb") }]);
  }, [setBreadcrumbs, t]);

  const {
    data: members,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.members.list(selectedCompanyId!),
    queryFn: () => membersApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const isOwner = true; // In local_trusted mode, user is always instance admin

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: MembershipRole }) =>
      membersApi.updateRole(selectedCompanyId!, userId, role),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.members.list(selectedCompanyId!) });
    },
    onError: (err) => {
      setActionError(err instanceof Error ? err.message : t("members.error"));
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => membersApi.remove(selectedCompanyId!, userId),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.members.list(selectedCompanyId!) });
    },
    onError: (err) => {
      setActionError(err instanceof Error ? err.message : t("members.error"));
    },
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      accessApi.createCompanyInvite(selectedCompanyId!, { allowedJoinTypes: "human" }),
    onSuccess: (data) => {
      setActionError(null);
      const url = `${window.location.origin}/invite/${data.token}`;
      setInviteUrl(url);
    },
    onError: (err) => {
      setActionError(err instanceof Error ? err.message : t("members.error"));
    },
  });

  function copyInviteLink() {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  }

  if (!selectedCompanyId) {
    return <p className="text-sm text-muted-foreground">{t("members.noCompany")}</p>;
  }

  if (isLoading) {
    return <PageSkeleton variant="list" />;
  }

  const isPending = updateRoleMutation.isPending || removeMutation.isPending;

  const userMembers = (members ?? []).filter((m) => m.principalType === "user");
  const agentMembers = (members ?? []).filter((m) => m.principalType === "agent");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">{t("members.title")}</h1>
          <span className="text-sm text-muted-foreground">({(members ?? []).length})</span>
        </div>
        <Button
          size="sm"
          onClick={() => inviteMutation.mutate()}
          disabled={inviteMutation.isPending}
          className="gap-1.5"
        >
          <UserPlus className="h-4 w-4" />
          {t("members.invite")}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : t("members.error")}
        </p>
      )}
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      {inviteUrl && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">{t("members.inviteGenerated")}</p>
            <p className="text-xs text-muted-foreground truncate">{inviteUrl}</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={copyInviteLink}>
            {inviteCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {inviteCopied ? t("members.inviteLinkCopied") : t("members.inviteLink")}
          </Button>
        </div>
      )}

      {userMembers.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t("members.typeUser")} ({userMembers.length})
          </h2>
          <div className="grid gap-2">
            {userMembers.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isOwner={isOwner}
                onUpdateRole={(userId, role) => updateRoleMutation.mutate({ userId, role })}
                onRemove={(userId) => removeMutation.mutate(userId)}
                isPending={isPending}
              />
            ))}
          </div>
        </div>
      )}

      {agentMembers.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t("members.typeAgent")} ({agentMembers.length})
          </h2>
          <div className="grid gap-2">
            {agentMembers.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isOwner={false}
                onUpdateRole={() => {}}
                onRemove={() => {}}
                isPending={isPending}
              />
            ))}
          </div>
        </div>
      )}

      {(members ?? []).length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">{t("members.empty")}</p>
        </div>
      )}
    </div>
  );
}
