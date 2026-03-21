import type { Request } from "express";
import type { Db } from "@paperclipai/db";
import type { MembershipRole } from "@paperclipai/shared";
import { forbidden, unauthorized } from "../errors.js";
import { accessService } from "../services/index.js";

export function assertBoard(req: Request) {
  if (req.actor.type !== "board") {
    throw forbidden("Board access required");
  }
}

export function assertCompanyAccess(req: Request, companyId: string) {
  if (req.actor.type === "none") {
    throw unauthorized();
  }
  if (req.actor.type === "agent" && req.actor.companyId !== companyId) {
    throw forbidden("Agent key cannot access another company");
  }
  if (req.actor.type === "board" && req.actor.source !== "local_implicit" && !req.actor.isInstanceAdmin) {
    const allowedCompanies = req.actor.companyIds ?? [];
    if (!allowedCompanies.includes(companyId)) {
      throw forbidden("User does not have access to this company");
    }
  }
}

export function getActorInfo(req: Request) {
  if (req.actor.type === "none") {
    throw unauthorized();
  }
  if (req.actor.type === "agent") {
    return {
      actorType: "agent" as const,
      actorId: req.actor.agentId ?? "unknown-agent",
      agentId: req.actor.agentId ?? null,
      runId: req.actor.runId ?? null,
    };
  }

  return {
    actorType: "user" as const,
    actorId: req.actor.userId ?? "board",
    agentId: null,
    runId: req.actor.runId ?? null,
  };
}

/**
 * Assert that the board user holds at least `minRole` in the given company.
 * Local-implicit (local_trusted) and instance admins always pass.
 */
export async function assertCompanyRole(
  db: Db,
  req: Request,
  companyId: string,
  minRole: MembershipRole,
) {
  assertBoard(req);
  assertCompanyAccess(req, companyId);
  // Local trusted mode — always allowed
  if (req.actor.source === "local_implicit") return;
  // Instance admins always allowed
  if (req.actor.isInstanceAdmin) return;

  const access = accessService(db);
  const role = await access.getUserRole(companyId, req.actor.userId ?? "");
  if (!role) throw forbidden("You are not a member of this company");
  if (!access.hasRole(role, minRole)) {
    throw forbidden(`Requires at least ${minRole} role`);
  }
}
