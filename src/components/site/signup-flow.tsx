"use client";

import { Check, MicrophoneStage, VinylRecord } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Field } from "@/components/site/field";
import { Button } from "@/components/ui/button";
import { type PlanId, getPlan, plans } from "@/lib/site";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;
type Screen = Step | "done";

const stepLabels = ["Plan", "Details", "Payment"] as const;

const planIcons: Record<PlanId, typeof VinylRecord> = {
  free: VinylRecord,
  starter: MicrophoneStage,
  pro: VinylRecord,
};

export function SignupFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();
  const [screen, setScreen] = useState<Screen>(1);
  const [direction, setDirection] = useState(1);
  const [planId, setPlanId] = useState<PlanId>(
    getPlan(searchParams.get("plan")).id
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [artist, setArtist] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");

  const plan = getPlan(planId);
  const go = (next: Screen, dir: number) => {
    setDirection(dir);
    setScreen(next);
  };

  const currentStep = screen === "done" ? 3 : screen;

  async function createAccount(thenCheckout: boolean) {
    setError("");
    setStatus("loading");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          planId,
          artistName: artist,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Signup failed");
        setStatus("idle");
        return;
      }

      if (thenCheckout) {
        const checkout = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId }),
        });
        const checkoutData = await checkout.json();
        if (checkout.ok && checkoutData.url) {
          window.location.href = checkoutData.url;
          return;
        }
        // Stripe not configured — land in dashboard on free until billing is set up
        setError(
          checkoutData.error ??
            "Stripe is not configured yet. Account created on Free — upgrade from Subscription."
        );
        setStatus("idle");
        go("done", 1);
        return;
      }

      go("done", 1);
      setStatus("idle");
    } catch {
      setError("Network error. Try again.");
      setStatus("idle");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-7 shadow-sm md:p-9">
      {screen !== "done" ? (
        <ol className="mb-9 flex items-center gap-2" aria-label="Signup steps">
          {stepLabels.map((label, index) => {
            const stepNumber = (index + 1) as Step;
            const isDone = currentStep > stepNumber;
            const isCurrent = currentStep === stepNumber;
            return (
              <li key={label} className="flex flex-1 items-center gap-2">
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors",
                    isDone || isCurrent
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isDone ? (
                    <Check className="size-3.5" weight="bold" />
                  ) : (
                    stepNumber
                  )}
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
                {index < stepLabels.length - 1 ? (
                  <span
                    className={cn(
                      "h-px flex-1",
                      isDone ? "bg-primary" : "bg-border"
                    )}
                    aria-hidden="true"
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : null}

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={String(screen)}
          custom={direction}
          initial={reduceMotion ? false : { opacity: 0, x: direction * 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={
            reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * -32 }
          }
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {screen === 1 ? (
            <>
              <h2 className="text-2xl font-bold tracking-tight">
                Choose your plan
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Start free or unlock the full catalog. You can switch later.
              </p>
              <div
                className="mt-7 grid gap-4"
                role="radiogroup"
                aria-label="Plan"
              >
                {plans.map((item) => {
                  const selected = planId === item.id;
                  const Icon = planIcons[item.id];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setPlanId(item.id)}
                      className={cn(
                        "relative grid gap-3 rounded-xl border-2 p-5 text-left transition-colors",
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:border-muted-foreground/40"
                      )}
                    >
                      {item.id === "starter" ? (
                        <span className="absolute -top-3 right-5 rounded-full bg-primary px-3 py-0.5 text-[11px] font-bold text-primary-foreground">
                          Most popular
                        </span>
                      ) : null}
                      <div className="flex items-center gap-3.5">
                        <span
                          className={cn(
                            "grid size-11 shrink-0 place-items-center rounded-xl",
                            selected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="size-5" weight="fill" />
                        </span>
                        <div className="flex-1">
                          <p className="font-bold">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.summary}
                          </p>
                        </div>
                        <p className="text-right">
                          <span className="text-xl font-extrabold tracking-tight">
                            {item.price}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            {item.period}
                          </span>
                        </p>
                      </div>
                      <ul className="grid gap-1.5 pl-[3.75rem] sm:grid-cols-2">
                        {item.features.map((feature) => (
                          <li
                            key={feature}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground"
                          >
                            <Check
                              className="size-3 shrink-0 text-primary"
                              weight="bold"
                            />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
              <Button className="mt-7 h-12 w-full" onClick={() => go(2, 1)}>
                Continue
              </Button>
            </>
          ) : screen === 2 ? (
            <>
              <h2 className="text-2xl font-bold tracking-tight">
                Your details
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {plan.paid
                  ? `${plan.name} selected. Next you will pay securely with Stripe.`
                  : "Free plan selected. No payment needed."}
              </p>
              <form
                className="mt-7 grid gap-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void createAccount(plan.paid);
                }}
              >
                <Field
                  id="name"
                  label="Full name"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <Field
                  id="email"
                  label="Email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <Field
                  id="password"
                  label="Password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  helper="At least 8 characters"
                />
                <Field
                  id="artist"
                  label="Artist name"
                  required
                  value={artist}
                  onChange={(event) => setArtist(event.target.value)}
                  helper="Counts toward your plan artist limit"
                />
                {error ? (
                  <p className="text-sm font-medium text-red-700" role="alert">
                    {error}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  className="h-12"
                  disabled={status === "loading"}
                >
                  {status === "loading"
                    ? "Creating account…"
                    : plan.paid
                      ? "Continue to Stripe"
                      : "Create free account"}
                </Button>
                <button
                  type="button"
                  className="justify-self-start text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  onClick={() => go(1, -1)}
                >
                  Back to plans
                </button>
              </form>
            </>
          ) : screen === 3 ? (
            <>
              <h2 className="text-2xl font-bold tracking-tight">Payment</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Redirecting to Stripe Checkout…
              </p>
            </>
          ) : (
            <div role="status" className="py-4 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-500/10">
                <Check className="size-6 text-emerald-600" weight="bold" />
              </span>
              <h2 className="mt-5 text-2xl font-bold tracking-tight">
                You are in.
              </h2>
              <p className="mx-auto mt-3 max-w-[36ch] text-sm leading-relaxed text-muted-foreground">
                Your RDISTRO account is ready. Catalog and billing live in your
                dashboard.
              </p>
              <Button
                className="mt-7 h-12 px-6"
                onClick={() => {
                  router.push("/dashboard");
                  router.refresh();
                }}
              >
                Open dashboard
              </Button>
              <p className="mt-4 text-sm text-muted-foreground">
                Or{" "}
                <Link href="/login" className="font-semibold underline-offset-4 hover:underline">
                  log in later
                </Link>
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
