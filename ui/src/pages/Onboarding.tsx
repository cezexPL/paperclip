import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useCompany } from "../context/CompanyContext";
import { onboardingApi, type OnboardingProfile, type UseCase, type CompanySource, type DeployMode, type AutonomyMode } from "../api/onboarding";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  Briefcase,
  Sparkles,
  FolderPlus,
  FolderOpen,
  Monitor,
  Share2,
  Globe,
  Hand,
  Shuffle,
  Zap,
  Check,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Rocket,
} from "lucide-react";
import { cn } from "../lib/utils";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface OptionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

function OptionCard({ icon, title, description, selected, onClick }: OptionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-4 rounded-lg border p-4 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border bg-card hover:border-primary/50",
      )}
    >
      <div className={cn("mt-0.5 shrink-0", selected ? "text-primary" : "text-muted-foreground")}>
        {icon}
      </div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      </div>
      {selected && (
        <div className="ml-auto shrink-0 text-primary">
          <Check className="h-5 w-5" />
        </div>
      )}
    </button>
  );
}

export function GuidedOnboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { reloadCompanies, setSelectedCompanyId } = useCompany();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile state
  const [useCase, setUseCase] = useState<UseCase | null>(null);
  const [companySource, setCompanySource] = useState<CompanySource | null>(null);
  const [deployMode, setDeployMode] = useState<DeployMode | null>(null);
  const [autonomyMode, setAutonomyMode] = useState<AutonomyMode | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [companyGoal, setCompanyGoal] = useState("");

  // Runtime detection
  const statusQuery = useQuery({
    queryKey: ["onboarding", "status"],
    queryFn: () => onboardingApi.getStatus(),
    staleTime: 60_000,
  });

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return useCase !== null;
      case 2: return companySource !== null;
      case 3: return deployMode !== null;
      case 4: return autonomyMode !== null;
      case 5: return true;
      case 6: return companyName.trim().length > 0;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < 6) setStep((step + 1) as Step);
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as Step);
  };

  const handleComplete = async () => {
    if (!useCase || !companySource || !deployMode || !autonomyMode || !companyName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const profile: OnboardingProfile = {
        useCase,
        companySource,
        deployMode,
        autonomyMode,
        companyName: companyName.trim(),
        companyGoal: companyGoal.trim() || undefined,
      };

      const result = await onboardingApi.complete(profile);

      await reloadCompanies();
      setSelectedCompanyId(result.company.id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });

      navigate(`/${result.company.issuePrefix}/dashboard`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("guidedOnboarding.failedComplete"));
    } finally {
      setLoading(false);
    }
  };

  const stepIndicators = [1, 2, 3, 4, 5, 6] as const;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {stepIndicators.map((s) => (
            <div
              key={s}
              className={cn(
                "h-2 w-8 rounded-full transition-colors",
                s === step ? "bg-primary" : s < step ? "bg-primary/40" : "bg-muted",
              )}
            />
          ))}
        </div>

        <div className="rounded-lg border border-border bg-card p-8">
          {/* Step 1: Use Case */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold">{t("guidedOnboarding.step1Title")}</h1>
                <p className="mt-2 text-muted-foreground">{t("guidedOnboarding.step1Desc")}</p>
              </div>
              <div className="space-y-3">
                <OptionCard
                  icon={<Sparkles className="h-5 w-5" />}
                  title={t("guidedOnboarding.startup")}
                  description={t("guidedOnboarding.startupDesc")}
                  selected={useCase === "startup"}
                  onClick={() => setUseCase("startup")}
                />
                <OptionCard
                  icon={<Briefcase className="h-5 w-5" />}
                  title={t("guidedOnboarding.agency")}
                  description={t("guidedOnboarding.agencyDesc")}
                  selected={useCase === "agency"}
                  onClick={() => setUseCase("agency")}
                />
                <OptionCard
                  icon={<Users className="h-5 w-5" />}
                  title={t("guidedOnboarding.internalTeam")}
                  description={t("guidedOnboarding.internalTeamDesc")}
                  selected={useCase === "internal_team"}
                  onClick={() => setUseCase("internal_team")}
                />
              </div>
            </div>
          )}

          {/* Step 2: New or Existing */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold">{t("guidedOnboarding.step2Title")}</h1>
                <p className="mt-2 text-muted-foreground">{t("guidedOnboarding.step2Desc")}</p>
              </div>
              <div className="space-y-3">
                <OptionCard
                  icon={<FolderPlus className="h-5 w-5" />}
                  title={t("guidedOnboarding.newCompany")}
                  description={t("guidedOnboarding.newCompanyDesc")}
                  selected={companySource === "new"}
                  onClick={() => setCompanySource("new")}
                />
                <OptionCard
                  icon={<FolderOpen className="h-5 w-5" />}
                  title={t("guidedOnboarding.existingCompany")}
                  description={t("guidedOnboarding.existingCompanyDesc")}
                  selected={companySource === "existing"}
                  onClick={() => setCompanySource("existing")}
                />
              </div>
            </div>
          )}

          {/* Step 3: Deployment */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold">{t("guidedOnboarding.step3Title")}</h1>
                <p className="mt-2 text-muted-foreground">{t("guidedOnboarding.step3Desc")}</p>
              </div>
              <div className="space-y-3">
                <OptionCard
                  icon={<Monitor className="h-5 w-5" />}
                  title={t("guidedOnboarding.solo")}
                  description={t("guidedOnboarding.soloDesc")}
                  selected={deployMode === "solo"}
                  onClick={() => setDeployMode("solo")}
                />
                <OptionCard
                  icon={<Share2 className="h-5 w-5" />}
                  title={t("guidedOnboarding.sharedPrivate")}
                  description={t("guidedOnboarding.sharedPrivateDesc")}
                  selected={deployMode === "shared_private"}
                  onClick={() => setDeployMode("shared_private")}
                />
                <OptionCard
                  icon={<Globe className="h-5 w-5" />}
                  title={t("guidedOnboarding.sharedPublic")}
                  description={t("guidedOnboarding.sharedPublicDesc")}
                  selected={deployMode === "shared_public"}
                  onClick={() => setDeployMode("shared_public")}
                />
              </div>
            </div>
          )}

          {/* Step 4: Autonomy */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold">{t("guidedOnboarding.step4Title")}</h1>
                <p className="mt-2 text-muted-foreground">{t("guidedOnboarding.step4Desc")}</p>
              </div>
              <div className="space-y-3">
                <OptionCard
                  icon={<Hand className="h-5 w-5" />}
                  title={t("guidedOnboarding.handsOn")}
                  description={t("guidedOnboarding.handsOnDesc")}
                  selected={autonomyMode === "hands_on"}
                  onClick={() => setAutonomyMode("hands_on")}
                />
                <OptionCard
                  icon={<Shuffle className="h-5 w-5" />}
                  title={t("guidedOnboarding.hybrid")}
                  description={t("guidedOnboarding.hybridDesc")}
                  selected={autonomyMode === "hybrid"}
                  onClick={() => setAutonomyMode("hybrid")}
                />
                <OptionCard
                  icon={<Zap className="h-5 w-5" />}
                  title={t("guidedOnboarding.fullAuto")}
                  description={t("guidedOnboarding.fullAutoDesc")}
                  selected={autonomyMode === "full_auto"}
                  onClick={() => setAutonomyMode("full_auto")}
                />
              </div>
            </div>
          )}

          {/* Step 5: Runtime Detection */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold">{t("guidedOnboarding.step5Title")}</h1>
                <p className="mt-2 text-muted-foreground">{t("guidedOnboarding.step5Desc")}</p>
              </div>
              {statusQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3">
                  {(statusQuery.data?.detectedRuntimes ?? []).map((runtime) => (
                    <div
                      key={runtime.cli}
                      className={cn(
                        "flex items-center gap-4 rounded-lg border p-4",
                        runtime.detected ? "border-green-500/50 bg-green-500/5" : "border-border bg-card",
                      )}
                    >
                      {runtime.detected ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-medium">{runtime.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {runtime.detected
                            ? t("guidedOnboarding.runtimeDetected", { cli: runtime.cli })
                            : t("guidedOnboarding.runtimeNotDetected", { cli: runtime.cli })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 6: Summary */}
          {step === 6 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold">{t("guidedOnboarding.step6Title")}</h1>
                <p className="mt-2 text-muted-foreground">{t("guidedOnboarding.step6Desc")}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">{t("guidedOnboarding.companyNameLabel")}</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={t("guidedOnboarding.companyNamePlaceholder")}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">{t("guidedOnboarding.goalLabel")}</label>
                  <textarea
                    value={companyGoal}
                    onChange={(e) => setCompanyGoal(e.target.value)}
                    placeholder={t("guidedOnboarding.goalPlaceholder")}
                    rows={3}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Summary */}
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <h3 className="mb-3 text-sm font-medium">{t("guidedOnboarding.summaryTitle")}</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{t("guidedOnboarding.step1Title")}</dt>
                      <dd>{useCase ? t(`guidedOnboarding.${useCase === "internal_team" ? "internalTeam" : useCase}`) : "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{t("guidedOnboarding.step2Title")}</dt>
                      <dd>{companySource ? t(`guidedOnboarding.${companySource === "new" ? "newCompany" : "existingCompany"}`) : "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{t("guidedOnboarding.step3Title")}</dt>
                      <dd>{deployMode ? t(`guidedOnboarding.${deployMode === "solo" ? "solo" : deployMode === "shared_private" ? "sharedPrivate" : "sharedPublic"}`) : "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{t("guidedOnboarding.step4Title")}</dt>
                      <dd>{autonomyMode ? t(`guidedOnboarding.${autonomyMode === "hands_on" ? "handsOn" : autonomyMode === "hybrid" ? "hybrid" : "fullAuto"}`) : "—"}</dd>
                    </div>
                    {(statusQuery.data?.detectedRuntimes ?? []).filter((r) => r.detected).length > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t("guidedOnboarding.detectedRuntimes")}</dt>
                        <dd>{(statusQuery.data?.detectedRuntimes ?? []).filter((r) => r.detected).map((r) => r.name).join(", ")}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              {error && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("common.back")}
            </Button>

            {step < 6 ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                {t("common.next")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={!canProceed() || loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Rocket className="mr-2 h-4 w-4" />
                )}
                {t("guidedOnboarding.createCompany")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
