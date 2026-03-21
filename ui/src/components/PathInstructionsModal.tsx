import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Apple, Monitor, Terminal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Platform = "mac" | "windows" | "linux";

const platformKeys: { id: Platform; labelKey: string; icon: typeof Apple }[] = [
  { id: "mac", labelKey: "pathInstructions.macos", icon: Apple },
  { id: "windows", labelKey: "pathInstructions.windows", icon: Monitor },
  { id: "linux", labelKey: "pathInstructions.linux", icon: Terminal },
];

const instructionKeys: Record<Platform, { stepKeys: string[]; tipKey?: string }> = {
  mac: {
    stepKeys: [
      "pathInstructions.macosStep1",
      "pathInstructions.macosStep2",
      "pathInstructions.macosStep3",
      "pathInstructions.macosStep4",
    ],
    tipKey: "pathInstructions.macosAlt",
  },
  windows: {
    stepKeys: [
      "pathInstructions.windowsStep1",
      "pathInstructions.windowsStep2",
      "pathInstructions.windowsStep3",
    ],
    tipKey: "pathInstructions.windowsAlt",
  },
  linux: {
    stepKeys: [
      "pathInstructions.linuxStep1",
      "pathInstructions.linuxStep2",
      "pathInstructions.linuxStep3",
    ],
    tipKey: "pathInstructions.linuxAlt",
  },
};

function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "mac";
  if (ua.includes("win")) return "windows";
  return "linux";
}

interface PathInstructionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PathInstructionsModal({
  open,
  onOpenChange,
}: PathInstructionsModalProps) {
  const { t } = useTranslation();
  const [platform, setPlatform] = useState<Platform>(detectPlatform);

  const current = instructionKeys[platform];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{t("pathInstructions.title")}</DialogTitle>
          <DialogDescription>
            {t("pathInstructions.instruction")}
          </DialogDescription>
        </DialogHeader>

        {/* Platform tabs */}
        <div className="flex gap-1 rounded-md border border-border p-0.5">
          {platformKeys.map((p) => (
            <button
              key={p.id}
              type="button"
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1 text-xs transition-colors",
                platform === p.id
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
              )}
              onClick={() => setPlatform(p.id)}
            >
              <p.icon className="h-3.5 w-3.5" />
              {t(p.labelKey)}
            </button>
          ))}
        </div>

        {/* Steps */}
        <ol className="space-y-2 text-sm">
          {current.stepKeys.map((stepKey, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-muted-foreground font-mono text-xs mt-0.5 shrink-0">
                {i + 1}.
              </span>
              <span>{t(stepKey)}</span>
            </li>
          ))}
        </ol>

        {current.tipKey && (
          <p className="text-xs text-muted-foreground border-l-2 border-border pl-3">
            {t(current.tipKey)}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Small "Choose" button that opens the PathInstructionsModal.
 * Drop-in replacement for the old showDirectoryPicker buttons.
 */
export function ChoosePathButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={cn(
          "inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent/50 transition-colors shrink-0",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        {t("common.choose")}
      </button>
      <PathInstructionsModal open={open} onOpenChange={setOpen} />
    </>
  );
}
