"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  CheckCircle,
  ShieldCheck,
  X,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";

export function WalletWithdraw({
  available,
  currency,
  threshold,
  fixedFee,
  percentageFee,
  hasPayoutMethod,
  payoutDestination,
}: {
  available: string;
  currency: string;
  threshold: number;
  fixedFee: string;
  percentageFee: string;
  hasPayoutMethod: boolean;
  payoutDestination: string;
}) {
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const canWithdraw = hasPayoutMethod && Number(available) >= threshold;
  const requestedAmount = Number(amount);
  const calculatedFee = Number.isFinite(requestedAmount) && requestedAmount > 0
    ? Number(fixedFee) + requestedAmount * (Number(percentageFee) / 100)
    : 0;
  const netPayable = Math.max(0, requestedAmount - calculatedFee);
  const amountIsValid = Number.isFinite(requestedAmount) && requestedAmount > 0;
  const money = (value: number) => new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/wallet/withdrawals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? "Could not request withdrawal.");
        return;
      }
      setSubmitted(true);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!canWithdraw}
        className="h-10 gap-2 bg-background px-5 text-foreground hover:bg-background/90"
      >
        <ArrowUpRight weight="bold" />
        Withdraw
      </Button>
      {!canWithdraw ? (
        <p className="mt-2 text-right text-[10px] text-background/45">
          {!hasPayoutMethod
            ? "Set a payout method first"
            : `Available balance must reach ${currency} ${threshold}`}
        </p>
      ) : null}
      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-[2px] sm:items-center sm:p-5"
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
              aria-labelledby="withdraw-dialog-title"
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
              className="w-full rounded-t-2xl bg-background p-5 text-foreground shadow-2xl sm:max-w-md sm:rounded-2xl sm:p-6"
            >
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close withdrawal form"
                className="absolute right-4 top-4 grid size-8 place-items-center rounded-full transition hover:bg-muted"
              >
                <X />
              </button>
              {submitted ? (
                <div className="py-8 text-center">
                  <CheckCircle
                    className="mx-auto text-emerald-600"
                    size={34}
                    weight="fill"
                  />
                  <h2 className="mt-4 text-lg font-semibold">
                    Withdrawal requested
                  </h2>
                  <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-muted-foreground">
                    The amount is reserved while RDISTRO finance reviews the
                    request.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="mt-5 h-10 px-5"
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <form onSubmit={submit}>
                  <div className="pr-8">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Payout request
                    </p>
                    <h2
                      id="withdraw-dialog-title"
                      className="mt-2 text-xl font-semibold"
                    >
                      Withdraw funds
                    </h2>
                  </div>
                  <div className="mt-6 rounded-xl bg-foreground p-5 text-background">
                    <p className="text-[10px] text-background/45">
                      Available balance
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency,
                      }).format(Number(available))}
                    </p>
                  </div>
                  <label className="mt-5 grid gap-2 text-xs font-medium">
                    Amount
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">
                        $
                      </span>
                      <input
                        required
                        autoFocus
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        inputMode="decimal"
                        pattern="\d+(\.\d{1,2})?"
                        className="h-11 w-full rounded-lg border border-border bg-background pl-7 pr-3 text-base font-semibold outline-none focus:border-foreground"
                      />
                    </div>
                  </label>
                  <dl className="mt-4 overflow-hidden rounded-xl border border-border bg-muted/25">
                    <div className="flex items-center justify-between gap-4 px-4 py-3 text-xs">
                      <dt className="text-muted-foreground">Withdrawal amount</dt>
                      <dd className="font-semibold tabular-nums">{money(Number.isFinite(requestedAmount) ? requestedAmount : 0)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-3 text-xs">
                      <dt className="text-muted-foreground">
                        Fee
                        {Number(percentageFee) > 0 ? ` (${Number(percentageFee)}%)` : ""}
                      </dt>
                      <dd className="font-semibold tabular-nums text-red-600">−{money(calculatedFee)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-border bg-background px-4 py-3">
                      <dt className="text-sm font-semibold">Net payable</dt>
                      <dd className="text-lg font-semibold tabular-nums text-emerald-700">{money(netPayable)}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-border p-4">
                    <ShieldCheck
                      className="mt-0.5 shrink-0 text-primary"
                      weight="duotone"
                    />
                    <div>
                      <p className="text-xs font-semibold">Payout to</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {payoutDestination}
                      </p>
                    </div>
                  </div>
                  {error ? (
                    <p className="mt-3 text-xs text-red-600">{error}</p>
                  ) : null}
                  <Button
                    type="submit"
                    className="mt-5 h-11 w-full"
                    loading={busy}
                    disabled={!amountIsValid || netPayable <= 0}
                  >
                    {busy ? "Reserving funds…" : "Request withdrawal"}
                  </Button>
                  <p className="mt-3 text-center text-[10px] leading-4 text-muted-foreground">
                    The fee is calculated from the payout method configured by
                    RDISTRO. This request remains pending until finance processes it.
                  </p>
                </form>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
