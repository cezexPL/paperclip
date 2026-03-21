import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { companyMemberships, authUsers } from "@paperclipai/db";
import type { CompanyRole } from "@paperclipai/shared";

const ROLE_HIERARCHY: Record<string, number> = {
  owner: 4,
  admin: 3,
  operator: 2,
  viewer: 1,
};

export function membershipService(db: Db) {
  async function listMembers(companyId: string) {
    const rows = await db
      .select({
        membership: companyMemberships,
        userName: authUsers.name,
        userEmail: authUsers.email,
        userImage: authUsers.image,
      })
      .from(companyMemberships)
      .leftJoin(
        authUsers,
        and(
          eq(companyMemberships.principalType, "user"),
          eq(companyMemberships.principalId, authUsers.id),
        ),
      )
      .where(
        and(
          eq(companyMemberships.companyId, companyId),
          eq(companyMemberships.principalType, "user"),
          eq(companyMemberships.status, "active"),
        ),
      )
      .orderBy(sql`${companyMemberships.createdAt} asc`);

    return rows.map((r) => ({
      ...r.membership,
      userName: r.userName,
      userEmail: r.userEmail,
      userImage: r.userImage,
    }));
  }

  async function getMemberRole(companyId: string, userId: string): Promise<CompanyRole | null> {
    const row = await db
      .select({ membershipRole: companyMemberships.membershipRole })
      .from(companyMemberships)
      .where(
        and(
          eq(companyMemberships.companyId, companyId),
          eq(companyMemberships.principalType, "user"),
          eq(companyMemberships.principalId, userId),
          eq(companyMemberships.status, "active"),
        ),
      )
      .then((rows) => rows[0] ?? null);
    return (row?.membershipRole as CompanyRole) ?? null;
  }

  function hasMinRole(userRole: CompanyRole | null, requiredRole: CompanyRole): boolean {
    if (!userRole) return false;
    return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
  }

  async function updateRole(companyId: string, memberId: string, role: CompanyRole) {
    const updated = await db
      .update(companyMemberships)
      .set({ membershipRole: role, updatedAt: new Date() })
      .where(
        and(
          eq(companyMemberships.id, memberId),
          eq(companyMemberships.companyId, companyId),
        ),
      )
      .returning()
      .then((rows) => rows[0] ?? null);
    return updated;
  }

  async function removeMember(companyId: string, memberId: string) {
    const deleted = await db
      .delete(companyMemberships)
      .where(
        and(
          eq(companyMemberships.id, memberId),
          eq(companyMemberships.companyId, companyId),
        ),
      )
      .returning()
      .then((rows) => rows[0] ?? null);
    return deleted;
  }

  async function addMember(
    companyId: string,
    userId: string,
    role: CompanyRole,
    invitedByUserId: string | null,
  ) {
    return db
      .insert(companyMemberships)
      .values({
        companyId,
        principalType: "user",
        principalId: userId,
        status: "active",
        membershipRole: role,
        invitedByUserId,
      })
      .returning()
      .then((rows) => rows[0]);
  }

  return {
    listMembers,
    getMemberRole,
    hasMinRole,
    updateRole,
    removeMember,
    addMember,
  };
}
