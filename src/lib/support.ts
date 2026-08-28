export const SUPPORT_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "release", label: "Release / catalog" },
  { value: "billing", label: "Billing" },
  { value: "account", label: "Account" },
  { value: "technical", label: "Technical" },
] as const;

export const SUPPORT_STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "answered", label: "Answered" },
  { value: "closed", label: "Closed" },
] as const;

export function supportCategoryLabel(value: string) {
  return SUPPORT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function supportStatusLabel(value: string) {
  return SUPPORT_STATUSES.find((s) => s.value === value)?.label ?? value;
}

/** Stable, user-facing reference without exposing the full database id. */
export function supportTicketNumber(id: string) {
  const compact = id.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return `#${compact.slice(-7).padStart(7, "0")}`;
}
