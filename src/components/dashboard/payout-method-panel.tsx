"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bank,
  CurrencyDollar,
  PaypalLogo,
  PencilSimple,
  ShieldCheck,
  X,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PayoutSettingsForm } from "@/components/dashboard/payout-settings-form";

export function PayoutMethodPanel({
  initial,
  accountName,
  maskedEmail,
}: {
  initial: {
    method: string | null;
    email: string;
    currency: string;
    threshold: number;
  };
  accountName: string;
  maskedEmail: string | null;
}) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();
  const label =
    initial.method === "wise"
      ? "Wise"
      : initial.method === "paypal"
        ? "PayPal"
        : initial.method === "bank_transfer"
          ? "Bank transfer"
          : "No payout method";
  const Icon =
    initial.method === "paypal"
      ? PaypalLogo
      : initial.method === "wise"
        ? CurrencyDollar
        : Bank;
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <aside className="relative flex h-full min-h-64 flex-col overflow-hidden rounded-2xl border border-border bg-card p-6">
        <div className="absolute right-0 top-0 size-36 translate-x-1/3 -translate-y-1/3 rounded-full border border-primary/10" />
        <div className="relative flex items-start justify-between">
          <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon size={21} weight="duotone" />
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
            <ShieldCheck weight="fill" />
            Protected
          </span>
        </div>
        <div className="relative mt-8">
          <p className="text-xs text-muted-foreground">Payout method</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">{label}</h2>
          {initial.method ? (
            <dl className="mt-5 space-y-3 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Currency</dt>
                <dd className="font-semibold">{initial.currency}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Account holder</dt>
                <dd className="truncate font-semibold">{accountName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Destination</dt>
                <dd className="font-semibold">
                  {maskedEmail ?? "Secure onboarding"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Add a payout method before requesting a withdrawal.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-xs font-semibold transition hover:border-foreground/20 hover:bg-muted active:scale-[0.98]"
        >
          <PencilSimple />
          {initial.method ? "Update payout method" : "Add payout method"}
        </button>
      </aside>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="payout-dialog-title"
              initial={
                reduceMotion
                  ? false
                  : { opacity: 0, transform: "translateY(24px) scale(0.985)" }
              }
              animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
              exit={{ opacity: 0, transform: "translateY(16px) scale(0.99)" }}
              transition={{
                duration: reduceMotion ? 0 : 0.3,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-background shadow-2xl sm:max-w-3xl sm:rounded-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-5 py-4 backdrop-blur">
                <div>
                  <h2 id="payout-dialog-title" className="font-semibold">
                    Update payout method
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Where would you like to receive payouts?
                  </p>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close payout settings"
                  className="grid size-8 place-items-center rounded-full transition hover:bg-muted"
                >
                  <X />
                </button>
              </div>
              <div className="p-4 sm:p-6">
                <PayoutSettingsForm initial={initial} />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
