"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  List,
  MagnifyingGlass,
  SignOut,
  X,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import AnimatedBrandLogo from "@/components/site/logo";
import { adminNav } from "@/lib/admin-nav";
import { hasPermission, type AdminPermission } from "@/lib/auth/permissions";
import { NAV_PERMISSION } from "@/lib/auth/permissions";
import type { UserRole } from "@prisma/client";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { AdminCommandSearch } from "@/components/admin/command-search";

export function AdminShell({
  children,
  adminName,
  adminRole,
}: {
  children: React.ReactNode;
  adminName: string;
  adminRole: UserRole;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const visibleNav = adminNav.filter((item) => {
    const perm = NAV_PERMISSION[item.href] as AdminPermission | undefined;
    if (!perm) return true;
    return hasPermission(adminRole, perm);
  });

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      setSearchOpen(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-col gap-0.5" aria-label="Admin">
      {visibleNav.map((item) => {
        const active =
          "exact" in item && item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-[oklch(0.965_0.004_250)] text-foreground">
      <div className="mx-auto flex min-h-dvh max-w-[1600px]">
        <aside className="hidden w-52 shrink-0 flex-col border-r border-border/80 bg-card px-3 py-5 lg:flex">
          <div className="px-1">
            <AnimatedBrandLogo
              className="h-8 w-auto"
              gradientId="adminSideWave"
            />
            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Operations
            </p>
          </div>
          <div className="mt-6 flex-1 overflow-y-auto">{nav}</div>
          <div className="border-t border-border/80 pt-4">
            <p className="truncate px-1 text-xs font-medium">{adminName}</p>
            <p className="mt-0.5 px-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              {adminRole.replace("_", " ")}
            </p>
            <Link
              href="/dashboard"
              className="mt-2 block px-1 text-[11px] text-muted-foreground underline-offset-2 hover:underline"
            >
              User dashboard
            </Link>
            <button
              type="button"
              onClick={logout}
              className="mt-3 inline-flex cursor-pointer items-center gap-1.5 px-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <SignOut className="size-3.5" />
              Log out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-border/80 bg-card/95 px-3 backdrop-blur lg:px-6">
            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                className="grid size-8 cursor-pointer place-items-center rounded-md hover:bg-muted"
                aria-label={open ? "Close menu" : "Open menu"}
                onClick={() => setOpen((v) => !v)}
              >
                {open ? (
                  <X className="size-4" weight="bold" />
                ) : (
                  <List className="size-4" weight="bold" />
                )}
              </button>
              <span className="text-sm font-semibold">Ops</span>
            </div>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="ml-auto flex h-8 max-w-md flex-1 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 text-left text-xs text-muted-foreground transition-colors hover:border-foreground/20 lg:ml-0"
            >
              <MagnifyingGlass className="size-3.5 shrink-0" />
              <span className="truncate">Search users, releases, UPC, ISRC…</span>
              <kbd className="ml-auto hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] sm:inline">
                ⌘K
              </kbd>
            </button>

            <Link
              href="/admin/review-queue"
              className={cn(buttonVariants(), "h-8 shrink-0 px-3 text-xs")}
            >
              Review queue
            </Link>
          </header>

          {open ? (
            <div className="border-b border-border bg-card px-3 py-3 lg:hidden">
              {nav}
            </div>
          ) : null}

          <main className="flex-1 px-3 py-5 lg:px-6 lg:py-6">{children}</main>
        </div>
      </div>

      <AdminCommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
