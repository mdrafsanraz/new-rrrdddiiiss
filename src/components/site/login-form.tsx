"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetRequired, setResetRequired] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading">("idle");

  return (
    <form
      className="grid gap-5 rounded-2xl border border-border bg-card p-7 shadow-sm md:p-8"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        setResetRequired(false);
        setResetSent(false);
        setStatus("loading");
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error ?? "Login failed");
            setResetRequired(data.code === "PASSWORD_RESET_REQUIRED");
            setStatus("idle");
            return;
          }
          router.push(data.redirectTo ?? "/dashboard");
          router.refresh();
        } catch {
          setError("Network error. Try again.");
          setStatus("idle");
        }
      }}
    >
      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <div className="grid gap-2">
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Link
          href="/forgot-password"
          className="justify-self-end text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Forgot password?
        </Link>
      </div>
      {error ? (
        <div
          className="grid gap-3 border-l-2 border-amber-500 bg-amber-500/10 px-4 py-3"
          role="alert"
        >
          <p className="text-sm font-medium text-foreground">{error}</p>
          {resetRequired ? (
            resetSent ? (
              <p className="text-sm text-muted-foreground">
                Check your inbox for the password reset link.
              </p>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-fit"
                onClick={async () => {
                  setStatus("loading");
                  try {
                    const response = await fetch("/api/auth/forgot-password", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email }),
                    });
                    setResetSent(response.ok);
                    if (!response.ok) {
                      setError("Could not send the reset link. Please try again.");
                    }
                  } catch {
                    setError("Network error. Try again.");
                  } finally {
                    setStatus("idle");
                  }
                }}
              >
                Send password reset link
              </Button>
            )
          ) : null}
        </div>
      ) : null}
      <Button type="submit" className="h-12" disabled={status === "loading"}>
        {status === "loading" ? "Signing in…" : "Login"}
      </Button>
      <p className="text-sm text-muted-foreground">
        New to RDISTRO?{" "}
        <Link
          href="/signup"
          className="font-semibold text-foreground underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
