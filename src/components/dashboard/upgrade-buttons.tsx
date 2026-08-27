"use client";

import { useState } from "react";
import type { PlanId } from "@prisma/client";
import { Button } from "@/components/ui/button";

export function UpgradeButtons({
  currentPlan,
  stripeReady,
  hasCustomer,
}: {
  currentPlan: PlanId;
  stripeReady: boolean;
  hasCustomer: boolean;
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  async function checkout(planId: "starter" | "pro") {
    setError("");
    setLoading(planId);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
      setError(data.error ?? "Checkout unavailable");
      setLoading(null);
      return;
    }
    window.location.href = data.url;
  }

  async function portal() {
    setError("");
    setLoading("portal");
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (!res.ok || !data.url) {
      setError(data.error ?? "Portal unavailable");
      setLoading(null);
      return;
    }
    window.location.href = data.url;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {currentPlan !== "starter" ? (
        <Button
          className="h-10 px-5"
          disabled={!stripeReady || loading !== null}
          loading={loading === "starter"}
          onClick={() => void checkout("starter")}
        >
          {loading === "starter" ? "Redirecting…" : "Upgrade to Starter"}
        </Button>
      ) : null}
      {currentPlan !== "pro" ? (
        <Button
          className="h-10 px-5"
          disabled={!stripeReady || loading !== null}
          loading={loading === "pro"}
          onClick={() => void checkout("pro")}
        >
          {loading === "pro" ? "Redirecting…" : "Upgrade to Pro"}
        </Button>
      ) : null}
      {hasCustomer ? (
        <Button
          variant="outline"
          className="h-10 px-5"
          disabled={!stripeReady || loading !== null}
          loading={loading === "portal"}
          onClick={() => void portal()}
        >
          {loading === "portal" ? "Opening…" : "Customer portal"}
        </Button>
      ) : null}
      {error ? (
        <p className="w-full text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
