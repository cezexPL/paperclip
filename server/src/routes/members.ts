import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { COMPANY_ROLES } from "@paperclipai/shared";
import type { CompanyRole } from "@paperclipai/shared";
import { badRequest, forbidden, notFound } from "../errors.js";
import { membershipService } from "../services/memberships.js";
import { companyInviteService } from "../services/invites.js";
import { logActivity } from "../services/index.js";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";

type Params = Record<string, string>;

export function memberRoutes(db: Db) {
  const router = Router({ mergeParams: true });
  const svc = membershipService(db);
  const inviteSvc = companyInviteService(db);

  // GET /api/companies/:companyId/members
  router.get("/", async (req, res) => {
    assertBoard(req);
    const companyId = (req.params as Params).companyId;
    assertCompanyAccess(req, companyId);
    const members = await svc.listMembers(companyId);
    res.json(members);
  });

  // PATCH /api/companies/:companyId/members/:memberId
  router.patch("/:memberId", async (req, res) => {
    assertBoard(req);
    const companyId = (req.params as Params).companyId;
    assertCompanyAccess(req, companyId);

    const userId = req.actor.type === "board" ? req.actor.userId : null;
    if (!userId || !(req.actor.source === "local_implicit" || req.actor.isInstanceAdmin)) {
      const callerRole = await svc.getMemberRole(companyId, userId!);
      if (!svc.hasMinRole(callerRole, "owner")) {
        throw forbidden("Only owners can change roles");
      }
    }

    const { role } = req.body as { role?: string };
    if (!role || !COMPANY_ROLES.includes(role as CompanyRole)) {
      throw badRequest("Invalid role");
    }

    const updated = await svc.updateRole(companyId, (req.params as Params).memberId, role as CompanyRole);
    if (!updated) {
      throw notFound("Member not found");
    }

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "member.role_changed",
      entityType: "company",
      entityId: companyId,
      agentId: actor.agentId,
      runId: actor.runId,
      details: { memberId: updated.id, role },
    });

    res.json(updated);
  });

  // DELETE /api/companies/:companyId/members/:memberId
  router.delete("/:memberId", async (req, res) => {
    assertBoard(req);
    const companyId = (req.params as Params).companyId;
    assertCompanyAccess(req, companyId);

    const userId = req.actor.type === "board" ? req.actor.userId : null;
    if (!userId || !(req.actor.source === "local_implicit" || req.actor.isInstanceAdmin)) {
      const callerRole = await svc.getMemberRole(companyId, userId!);
      if (!svc.hasMinRole(callerRole, "admin")) {
        throw forbidden("Only admins can remove members");
      }
    }

    const deleted = await svc.removeMember(companyId, (req.params as Params).memberId);
    if (!deleted) {
      throw notFound("Member not found");
    }

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "member.removed",
      entityType: "company",
      entityId: companyId,
      agentId: actor.agentId,
      runId: actor.runId,
      details: { memberId: deleted.id },
    });

    res.json({ ok: true });
  });

  // POST /api/companies/:companyId/members/invites
  router.post("/invites", async (req, res) => {
    assertBoard(req);
    const companyId = (req.params as Params).companyId;
    assertCompanyAccess(req, companyId);

    const userId = req.actor.type === "board" ? req.actor.userId : null;
    if (!userId || !(req.actor.source === "local_implicit" || req.actor.isInstanceAdmin)) {
      const callerRole = await svc.getMemberRole(companyId, userId!);
      if (!svc.hasMinRole(callerRole, "admin")) {
        throw forbidden("Only admins can create invites");
      }
    }

    const { role } = req.body as { role?: string };
    const inviteRole = (role && COMPANY_ROLES.includes(role as CompanyRole) ? role : "operator") as CompanyRole;

    const invite = await inviteSvc.createInvite(companyId, inviteRole, userId ?? null);

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "member.invite_created",
      entityType: "company",
      entityId: companyId,
      agentId: actor.agentId,
      runId: actor.runId,
      details: { inviteId: invite!.id, role: inviteRole },
    });

    res.status(201).json(invite);
  });

  // GET /api/companies/:companyId/members/invites
  router.get("/invites", async (req, res) => {
    assertBoard(req);
    const companyId = (req.params as Params).companyId;
    assertCompanyAccess(req, companyId);
    const list = await inviteSvc.listByCompany(companyId);
    res.json(list);
  });

  return router;
}

export function inviteTokenRoutes(db: Db) {
  const router = Router();
  const inviteSvc = companyInviteService(db);
  const svc = membershipService(db);

  // GET /api/invites/collab/:token
  router.get("/collab/:token", async (req, res) => {
    const invite = await inviteSvc.getByToken(req.params.token as string);
    if (!invite) {
      throw notFound("Invite not found");
    }
    if (invite.acceptedAt) {
      throw badRequest("Invite already used");
    }
    if (new Date() > invite.expiresAt) {
      throw badRequest("Invite expired");
    }
    res.json({
      id: invite.id,
      companyId: invite.companyId,
      role: invite.role,
      expiresAt: invite.expiresAt,
    });
  });

  // POST /api/invites/collab/:token/accept
  router.post("/collab/:token/accept", async (req, res) => {
    assertBoard(req);
    const userId = req.actor.type === "board" ? req.actor.userId : null;
    if (!userId) {
      throw forbidden("Must be logged in to accept invite");
    }

    const invite = await inviteSvc.acceptInvite(req.params.token as string, userId);
    if (!invite) {
      throw badRequest("Invite invalid, expired, or already used");
    }

    await svc.addMember(invite.companyId, userId, invite.role as CompanyRole, invite.createdByUserId);

    res.json({ ok: true, companyId: invite.companyId, role: invite.role });
  });

  return router;
}
