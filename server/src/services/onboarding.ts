import { execSync } from "node:child_process";
import { eq, count } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { companies, agents, goals, issues } from "@paperclipai/db";

export type UseCase = "startup" | "agency" | "internal_team";
export type CompanySource = "new" | "existing";
export type DeployMode = "solo" | "shared_private" | "shared_public";
export type AutonomyMode = "hands_on" | "hybrid" | "full_auto";

export interface OnboardingProfile {
  useCase: UseCase;
  companySource: CompanySource;
  deployMode: DeployMode;
  autonomyMode: AutonomyMode;
  companyName: string;
  companyGoal?: string;
}

export interface DetectedRuntime {
  name: string;
  cli: string;
  detected: boolean;
  adapterType: string;
}

function detectCli(name: string): boolean {
  try {
    execSync(`which ${name}`, { stdio: "ignore", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export function onboardingService(db: Db) {
  async function getStatus() {
    const [companyCount] = await db
      .select({ value: count() })
      .from(companies);
    const completed = (companyCount?.value ?? 0) > 0;

    const detectedRuntimes: DetectedRuntime[] = [
      {
        name: "Claude Code",
        cli: "claude",
        detected: detectCli("claude"),
        adapterType: "claude_local",
      },
      {
        name: "Codex",
        cli: "codex",
        detected: detectCli("codex"),
        adapterType: "codex_local",
      },
      {
        name: "Gemini CLI",
        cli: "gemini",
        detected: detectCli("gemini"),
        adapterType: "gemini_local",
      },
    ];

    return {
      completed,
      detectedRuntimes,
    };
  }

  async function complete(profile: OnboardingProfile, detectedRuntimes: DetectedRuntime[]) {
    // Pick adapter type from first detected runtime, default to claude_local
    const primaryRuntime = detectedRuntimes.find((r) => r.detected);
    const adapterType = primaryRuntime?.adapterType ?? "claude_local";

    // Create company
    const [company] = await db
      .insert(companies)
      .values({
        name: profile.companyName,
        description: profile.companyGoal ?? null,
      })
      .returning();

    // Create CEO agent
    const [ceoAgent] = await db
      .insert(agents)
      .values({
        companyId: company!.id,
        name: "CEO",
        role: "ceo",
        title: "Chief Executive Officer",
        adapterType,
        adapterConfig: {},
        capabilities: "Strategic planning, company management, agent hiring and delegation",
      })
      .returning();

    // Create company goal if provided
    let goalRow = null;
    if (profile.companyGoal) {
      [goalRow] = await db
        .insert(goals)
        .values({
          companyId: company!.id,
          title: profile.companyGoal,
          level: "company",
        })
        .returning();
    }

    // Create first task
    const [firstIssue] = await db
      .insert(issues)
      .values({
        companyId: company!.id,
        title: "Review company goals and propose initial strategy breakdown",
        description:
          "As the newly appointed CEO, review the company goals and create a strategic breakdown with actionable next steps. Propose an organizational structure and identify key roles needed.",
        status: "backlog",
        priority: "high",
        assigneeAgentId: ceoAgent!.id,
        goalId: goalRow?.id ?? null,
      })
      .returning();

    return {
      company: company!,
      ceoAgent: ceoAgent!,
      goal: goalRow,
      firstIssue: firstIssue!,
    };
  }

  return { getStatus, complete };
}
