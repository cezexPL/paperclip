import { api } from "./client";

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

export interface OnboardingStatus {
  completed: boolean;
  detectedRuntimes: DetectedRuntime[];
}

export interface OnboardingResult {
  company: { id: string; name: string; issuePrefix: string };
  ceoAgent: { id: string; name: string };
  goal: { id: string; title: string } | null;
  firstIssue: { id: string; title: string; identifier: string | null };
}

export const onboardingApi = {
  getStatus: () => api.get<OnboardingStatus>("/onboarding/status"),
  complete: (profile: OnboardingProfile) =>
    api.post<OnboardingResult>("/onboarding/complete", { profile }),
};
