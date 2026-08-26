export const adminNav = [
  { href: "/admin", label: "Home", exact: true },
  { href: "/admin/releases", label: "Releases" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/artists", label: "Artists" },
  { href: "/admin/documents", label: "Rights & Documents" },
  { href: "/admin/takedowns", label: "Takedowns" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/royalties", label: "Royalties & Payouts" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/system", label: "LabelGrid / System" },
  { href: "/admin/audit", label: "Audit Logs" },
  { href: "/admin/settings", label: "Settings" },
] as const;

export type AdminNavItem = (typeof adminNav)[number];
