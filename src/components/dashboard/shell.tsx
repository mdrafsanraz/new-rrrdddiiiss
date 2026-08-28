"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChartLineUp,
  Coins,
  CreditCard,
  Disc,
  Gear,
  Lifebuoy,
  List,
  ShareNetwork,
  SignOut,
  SquaresFour,
  UsersThree,
  Wallet,
  X,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState, type ComponentType } from "react";
import AnimatedBrandLogo from "@/components/site/logo";
import { dashboardNav } from "@/lib/dashboard-nav";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

type PhosphorIcon = ComponentType<{ className?: string; weight?: "bold" | "regular" | "fill" }>;

/**
 * Presentation-only icon lookup keyed by the existing `dashboardNav` hrefs —
 * kept out of `dashboard-nav.ts` so that file (the actual nav data/routing
 * source of truth) stays untouched.
 */
const NAV_ICONS: Record<string, PhosphorIcon> = {
  "/dashboard": SquaresFour,
  "/dashboard/releases": Disc,
  "/dashboard/artists": UsersThree,
  "/dashboard/royalties": Coins,
  "/dashboard/analytics": ChartLineUp,
  "/dashboard/distribution": ShareNetwork,
  "/dashboard/payments": CreditCard,
  "/dashboard/subscription": Wallet,
  "/dashboard/support": Lifebuoy,
  "/dashboard/settings": Gear,
};

function NavList({
  pathname,
  showAdminLink,
  onNavigate,
}: {
  pathname: string;
  showAdminLink: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Dashboard">
      {dashboardNav.map((item) => {
        const active =
          "exact" in item && item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = NAV_ICONS[item.href];
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-[background-color,color,transform] duration-300 ease-[var(--ease-rdistro)] active:translate-y-px",
              active
                ? "bg-primary/12 text-foreground"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            )}
          >
            {Icon ? (
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
                weight="bold"
              />
            ) : null}
            {item.label}
          </Link>
        );
      })}
      {showAdminLink ? (
        <Link
          href="/admin"
          onClick={onNavigate}
          className="mt-2 border-l-2 border-transparent px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/8"
        >
          Admin console
        </Link>
      ) : null}
    </nav>
  );
}

export function DashboardShell({
  children,
  userName,
  planLabel,
  showAdminLink = false,
}: {
  children: React.ReactNode;
  userName: string;
  planLabel: string;
  showAdminLink?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="dashboard-theme min-h-dvh bg-background">
      <div className="flex min-h-dvh">
        <aside className="hidden w-[248px] shrink-0 flex-col border-r border-border/70 bg-card/75 px-5 py-7 backdrop-blur-xl lg:flex">
          <AnimatedBrandLogo className="h-9 w-auto" gradientId="dashSideWave" />
          <div className="mt-8 flex-1">
            <NavList pathname={pathname} showAdminLink={showAdminLink} />
          </div>
          <div className="border-t border-border pt-4">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{planLabel} plan</p>
            <button
              type="button"
              onClick={logout}
              className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <SignOut className="size-4" weight="bold" />
              Log out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border/70 bg-background/78 px-4 backdrop-blur-xl lg:px-10">
            <div className="flex items-center gap-3 lg:hidden">
              <button
                type="button"
                className="grid size-9 cursor-pointer place-items-center transition-colors hover:bg-muted"
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
              >
                <List className="size-5" weight="bold" />
              </button>
              <AnimatedBrandLogo className="h-8 w-auto" gradientId="dashMobileWave" />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Link href="/dashboard/releases/new" className={cn(buttonVariants(), "h-9 px-4 text-sm")}>
                New release
              </Link>
            </div>
          </header>

          <main className="rdistro-dashboard-grid flex-1 px-4 py-6 lg:px-10 lg:py-9">{children}</main>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border bg-card px-4 py-6 lg:hidden"
            initial={reduceMotion ? false : { x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 34 }}
          >
            <div className="flex items-center justify-between">
              <AnimatedBrandLogo className="h-8 w-auto" gradientId="dashDrawerWave" />
              <button
                type="button"
                className="grid size-9 cursor-pointer place-items-center transition-colors hover:bg-muted"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                <X className="size-5" weight="bold" />
              </button>
            </div>
            <div className="mt-8 flex-1 overflow-y-auto">
              <NavList
                pathname={pathname}
                showAdminLink={showAdminLink}
                onNavigate={() => setOpen(false)}
              />
            </div>
            <div className="border-t border-border pt-4">
              <p className="truncate text-sm font-medium">{userName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{planLabel} plan</p>
              <button
                type="button"
                onClick={logout}
                className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <SignOut className="size-4" weight="bold" />
                Log out
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
