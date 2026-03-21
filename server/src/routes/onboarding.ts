import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { onboardingService, type OnboardingProfile } from "../services/onboarding.js";
import { assertBoard } from "./authz.js";
import { logActivity } from "../services/activity-log.js";
import { badRequest } from "../errors.js";

const VALID_USE_CASES = ["startup", "agency", "internal_team"] as const;
const VALID_COMPANY_SOURCES = ["new", "existing"] as const;
const VALID_DEPLOY_MODES = ["solo", "shared_private", "shared_public"] as const;
const VALID_AUTONOMY_MODES = ["hands_on", "hybrid", "full_auto"] as const;

export function onboardingRoutes(db: Db) {
  const router = Router();
  const svc = onboardingService(db);

  router.get("/onboarding/status", async (req, res) => {
    assertBoard(req);
    const result = await svc.getStatus();
    res.json(result);
  });

  router.post("/onboarding/complete", async (req, res) => {
    assertBoard(req);

    const { profile } = req.body as { profile?: OnboardingProfile };
    if (!profile) {
      throw badRequest("Missing profile");
    }
    if (!profile.companyName || typeof profile.companyName !== "string") {
      throw badRequest("Missing companyName");
    }
    if (!VALID_USE_CASES.includes(profile.useCase as typeof VALID_USE_CASES[number])) {
      throw badRequest("Invalid useCase");
    }
    if (!VALID_COMPANY_SOURCES.includes(profile.companySource as typeof VALID_COMPANY_SOURCES[number])) {
      throw badRequest("Invalid companySource");
    }
    if (!VALID_DEPLOY_MODES.includes(profile.deployMode as typeof VALID_DEPLOY_MODES[number])) {
      throw badRequest("Invalid deployMode");
    }
    if (!VALID_AUTONOMY_MODES.includes(profile.autonomyMode as typeof VALID_AUTONOMY_MODES[number])) {
      throw badRequest("Invalid autonomyMode");
    }

    // Get fresh runtime detection for the completion
    const status = await svc.getStatus();
    const result = await svc.complete(profile, status.detectedRuntimes);

    await logActivity(db, {
      companyId: result.company.id,
      actorType: "user",
      actorId: req.actor.type === "board" ? (req.actor.userId ?? "system") : "system",
      action: "onboarding.completed",
      entityType: "company",
      entityId: result.company.id,
      details: {
        useCase: profile.useCase,
        companySource: profile.companySource,
        deployMode: profile.deployMode,
        autonomyMode: profile.autonomyMode,
      },
    });

    res.status(201).json(result);
  });

  return router;
}
