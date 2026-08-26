"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { List, SignOut, X } from "@phosphor-icons/react";
import { useState } from "react";
import AnimatedBrandLogo from "@/components/site/logo";
import { adminNav } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export function AdminShell({
  children,
  adminName,
}: {
  children: React.ReactNode;
  adminName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-col gap-0.5" aria-label="Admin">
      {adminNav.map((item) => {
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
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
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
    <div className="min-h-dvh bg-[oklch(0.97_0.006_250)]">
      <div className="mx-auto flex min-h-dvh max-w-[1400px]">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-card px-4 py-6 lg:flex">
          <div>
            <AnimatedBrandLogo
              className="h-9 w-auto"
              gradientId="adminSideWave"
            />
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Admin
            </p>
          </div>
          <div className="mt-8 flex-1">{nav}</div>
          <div className="pt-10">
            <p className="truncate text-sm font-medium">{adminName}</p>
            <Link
              href="/dashboard"
              className="mt-2 block text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              User dashboard
            </Link>
            <button
              type="button"
              onClick={logout}
              className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <SignOut className="size-4" />
              Log out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between gap-3 border-b border-border bg-card px-4 lg:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <button
                type="button"
                className="grid size-9 cursor-pointer place-items-center rounded-md hover:bg-muted"
                aria-label={open ? "Close menu" : "Open menu"}
                onClick={() => setOpen((v) => !v)}
              >
                {open ? (
                  <X className="size-5" weight="bold" />
                ) : (
                  <List className="size-5" weight="bold" />
                )}
              </button>
              <span className="text-sm font-semibold">Admin</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/admin/releases?status=in_review"
                className={cn(buttonVariants(), "h-9 px-4 text-sm")}
              >
                Review queue
              </Link>
            </div>
          </header>

          {open ? (
            <div className="border-b border-border bg-card px-4 py-4 lg:hidden">
              {nav}
            </div>
          ) : null}

          <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
