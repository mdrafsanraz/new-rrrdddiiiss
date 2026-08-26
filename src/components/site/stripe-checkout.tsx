"use client";

import { Lock } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PlanId } from "@/lib/site";
import { getPlan } from "@/lib/site";

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function formatCard(value: string) {
  return digitsOnly(value)
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(value: string) {
  const digits = digitsOnly(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
}

function validExpiry(value: string) {
  const match = value.match(/^(\d{2})\s\/\s(\d{2})$/);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const expiry = new Date(year, month);
  return expiry > now;
}

type StripeCheckoutProps = {
  planId: PlanId;
  onBack: () => void;
  onPaid: () => void;
};

export function StripeCheckout({ planId, onBack, onPaid }: StripeCheckoutProps) {
  const plan = getPlan(planId);
  const [card, setCard] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");

  return (
    <form
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        const number = digitsOnly(card);
        if (number.length !== 16) {
          setError("Enter a 16-digit card number.");
          return;
        }
        if (!validExpiry(expiry)) {
          setError("Enter a valid future expiry.");
          return;
        }
        if (digitsOnly(cvc).length < 3) {
          setError("Enter the CVC.");
          return;
        }
        if (!name.trim()) {
          setError("Enter the name on the card.");
          return;
        }
        setError("");
        setStatus("loading");
        window.setTimeout(onPaid, 900);
      }}
    >
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-5 py-4">
        <p className="text-sm font-semibold">{plan.name} plan</p>
        <p className="text-sm font-bold">
          {plan.price}
          <span className="font-medium text-muted-foreground">
            {plan.period}
          </span>
        </p>
      </div>

      <div className="grid gap-2">
        <label htmlFor="card" className="text-sm font-medium">
          Card
        </label>
        <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/25">
          <input
            id="card"
            name="card"
            inputMode="numeric"
            autoComplete="cc-number"
            required
            placeholder="Card number"
            value={card}
            onChange={(event) => setCard(formatCard(event.target.value))}
            className="w-full border-b border-border bg-transparent px-4 py-3.5 text-sm outline-none"
          />
          <div className="grid grid-cols-2">
            <div>
              <label htmlFor="expiry" className="sr-only">
                Expiry
              </label>
              <input
                id="expiry"
                name="expiry"
                inputMode="numeric"
                autoComplete="cc-exp"
                required
                placeholder="MM / YY"
                value={expiry}
                onChange={(event) =>
                  setExpiry(formatExpiry(event.target.value))
                }
                className="w-full border-r border-border bg-transparent px-4 py-3.5 text-sm outline-none"
              />
            </div>
            <div>
              <label htmlFor="cvc" className="sr-only">
                CVC
              </label>
              <input
                id="cvc"
                name="cvc"
                inputMode="numeric"
                autoComplete="cc-csc"
                required
                placeholder="CVC"
                maxLength={4}
                value={cvc}
                onChange={(event) =>
                  setCvc(digitsOnly(event.target.value).slice(0, 4))
                }
                className="w-full bg-transparent px-4 py-3.5 text-sm outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <label htmlFor="card-name" className="text-sm font-medium">
          Name on card
        </label>
        <input
          id="card-name"
          name="card-name"
          autoComplete="cc-name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-xl border border-border bg-background px-4 py-3.5 text-sm shadow-sm outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/25"
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="h-12" disabled={status === "loading"}>
        <Lock className="size-4" weight="bold" />
        {status === "loading"
          ? "Processing…"
          : `Pay ${plan.price} with Stripe`}
      </Button>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          onClick={onBack}
        >
          Back
        </button>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3.5" weight="bold" />
          Test checkout. Live Stripe keys land with the API.
        </p>
      </div>
    </form>
  );
}
