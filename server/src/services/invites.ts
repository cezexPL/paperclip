import { randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { companyInvites } from "@paperclipai/db";
import type { CompanyRole } from "@paperclipai/shared";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateToken(): string {
  return `pcp_collab_${randomBytes(16).toString("hex")}`;
}

export function companyInviteService(db: Db) {
  async function createInvite(
    companyId: string,
    role: CompanyRole,
    createdByUserId: string | null,
  ) {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const invite = await db
      .insert(companyInvites)
      .values({
        companyId,
        token,
        role,
        createdByUserId,
        expiresAt,
      })
      .returning()
      .then((rows) => rows[0]);

    return invite;
  }

  async function getByToken(token: string) {
    return db
      .select()
      .from(companyInvites)
      .where(eq(companyInvites.token, token))
      .then((rows) => rows[0] ?? null);
  }

  async function acceptInvite(token: string, userId: string) {
    const invite = await getByToken(token);
    if (!invite) return null;
    if (invite.acceptedAt) return null;
    if (new Date() > invite.expiresAt) return null;

    const updated = await db
      .update(companyInvites)
      .set({
        acceptedAt: new Date(),
        acceptedByUserId: userId,
      })
      .where(
        and(
          eq(companyInvites.id, invite.id),
          isNull(companyInvites.acceptedAt),
        ),
      )
      .returning()
      .then((rows) => rows[0] ?? null);

    return updated;
  }

  async function listByCompany(companyId: string) {
    return db
      .select()
      .from(companyInvites)
      .where(eq(companyInvites.companyId, companyId))
      .orderBy(companyInvites.createdAt);
  }

  return {
    createInvite,
    getByToken,
    acceptInvite,
    listByCompany,
  };
}
