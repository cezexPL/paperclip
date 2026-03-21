import type { Request, RequestHandler } from "express";
import type { Db } from "@paperclipai/db";
import type { CompanyRole } from "@paperclipai/shared";
import { forbidden, unauthorized } from "../errors.js";
import { membershipService } from "../services/memberships.js";

const ROLE_HIERARCHY: Record<string, number> = {
  owner: 4,
  admin: 3,
  operator: 2,
  viewer: 1,
};

function hasMinRole(userRole: CompanyRole | null, requiredRole: CompanyRole): boolean {
  if (!userRole) return false;
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

export function authorizeCompanyRole(db: Db, minRole: CompanyRole): RequestHandler {
  const svc = membershipService(db);

  return async (req, _res, next) => {
    if (req.actor.type === "none") {
      throw unauthorized();
    }

    // Local-trusted mode bypasses membership checks
    if (req.actor.type === "board" && req.actor.source === "local_implicit") {
      next();
      return;
    }

    // Instance admins bypass membership checks
    if (req.actor.type === "board" && req.actor.isInstanceAdmin) {
      next();
      return;
    }

    // Agent actors use company-scoped access, not role-based
    if (req.actor.type === "agent") {
      next();
      return;
    }

    const companyId = (req.params as Record<string, string>).companyId ?? (req.params as Record<string, string>).id;
    if (!companyId) {
      throw forbidden("Company ID required");
    }

    const userId = req.actor.userId;
    if (!userId) {
      throw unauthorized();
    }

    const role = await svc.getMemberRole(companyId, userId);
    if (!hasMinRole(role, minRole)) {
      throw forbidden(`Requires ${minRole} role or higher`);
    }

    next();
  };
}
