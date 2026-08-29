export const adminNavGroups = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", exact: true },
      { href: "/admin/action-required", label: "Action Required" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/admin/releases", label: "Releases" },
      { href: "/admin/review-queue", label: "Review Queue" },
      { href: "/admin/artists", label: "Artists" },
      { href: "/admin/labels", label: "Labels" },
      { href: "/admin/takedowns", label: "Takedowns" },
    ],
  },
  {
    label: "Customers",
    items: [
      { href: "/admin/users", label: "Users" },
      { href: "/admin/support", label: "Support" },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/admin/royalties", label: "Royalties" },
      { href: "/admin/wallets", label: "Wallets" },
      { href: "/admin/withdrawals", label: "Withdrawals" },
      { href: "/admin/transactions", label: "Transactions" },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/admin/subscriptions", label: "Subscriptions" },
      { href: "/admin/analytics", label: "Analytics" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/audit", label: "Activity" },
      { href: "/admin/admins", label: "Staff & Permissions" },
      { href: "/admin/settings", label: "Settings" },
    ],
  },
] as const;

export type AdminNavGroup = (typeof adminNavGroups)[number];
export type AdminNavItem = AdminNavGroup["items"][number];
