import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const next = i18n.language === "pl" ? "en" : "pl";
    i18n.changeLanguage(next);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="text-muted-foreground shrink-0"
      onClick={toggleLanguage}
      aria-label={t("languageSwitcher.label")}
      title={i18n.language === "pl" ? t("languageSwitcher.en") : t("languageSwitcher.pl")}
    >
      <Globe className="h-4 w-4" />
    </Button>
  );
}
