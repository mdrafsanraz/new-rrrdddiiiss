"use client";

import { List, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import AnimatedBrandLogo from "@/components/site/logo";
import { buttonVariants } from "@/components/ui/button-variants";
import { navLinks } from "@/lib/site";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ authenticated = false }: { authenticated?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
        <AnimatedBrandLogo className="h-9 md:h-10 w-auto" gradientId="headerWaveGradient" />

        <nav className="hidden items-center gap-9 lg:flex" aria-label="Primary">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                isActive(pathname, link.href) && "text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 lg:flex">
          {authenticated ? (
            <Link href="/dashboard" className={cn(buttonVariants(), "h-10 px-5")}>Start distributing</Link>
          ) : (
            <>
              <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "h-10 px-4")}>Login</Link>
              <Link href="/signup" className={cn(buttonVariants(), "h-10 px-5")}>Sign up</Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="grid size-10 place-items-center rounded-lg text-foreground lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? (
            <X className="size-6" weight="bold" />
          ) : (
            <List className="size-6" weight="bold" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="mobile-nav"
            className="overflow-hidden border-b border-border bg-background lg:hidden"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <nav
              className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4"
              aria-label="Mobile"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted",
                    isActive(pathname, link.href)
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {authenticated ? (
                <Link href="/dashboard" className={cn(buttonVariants(), "mt-2 h-11 w-full")} onClick={() => setOpen(false)}>Start distributing</Link>
              ) : (
                <>
                  <Link href="/login" className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setOpen(false)}>Login</Link>
                  <Link href="/signup" className={cn(buttonVariants(), "mt-2 h-11 w-full")} onClick={() => setOpen(false)}>Sign up</Link>
                </>
              )}
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
