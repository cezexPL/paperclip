/**
 * Minimal i18n for the members feature.
 * Polish translations with English fallback.
 */

const pl: Record<string, string> = {
  "members.title": "Członkowie",
  "members.breadcrumb": "Członkowie",
  "members.add": "Dodaj członka",
  "members.invite": "Zaproś",
  "members.remove": "Usuń",
  "members.remove_confirm": "Czy na pewno chcesz usunąć tego członka?",
  "members.empty": "Brak członków w tej firmie.",
  "members.role": "Rola",
  "members.role.owner": "Właściciel",
  "members.role.admin": "Administrator",
  "members.role.operator": "Operator",
  "members.role.viewer": "Obserwator",
  "members.email": "Email",
  "members.name": "Nazwa",
  "members.joined": "Dołączył",
  "members.type": "Typ",
  "members.type.user": "Użytkownik",
  "members.type.agent": "Agent",
  "members.change_role": "Zmień rolę",
  "members.invite_link": "Link z zaproszeniem",
  "members.invite_link_copied": "Skopiowano link zaproszenia!",
  "members.invite_generated": "Zaproszenie wygenerowane",
  "members.invite_expires": "Wygasa",
  "members.no_company": "Wybierz firmę.",
  "members.loading": "Ładowanie...",
  "members.error": "Błąd ładowania członków",
  "members.last_owner": "Nie można usunąć ostatniego właściciela",
  "members.added": "Członek dodany",
  "members.removed": "Członek usunięty",
  "members.role_updated": "Rola zaktualizowana",
  "members.activity_log": "Dziennik aktywności",
  "members.who_did_what": "kto co zrobił",
};

export function useTranslation() {
  function t(key: string): string {
    return pl[key] ?? key;
  }
  return { t };
}
