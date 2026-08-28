"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");

  if (!token) {
    return (
      <div className="grid gap-4 rounded-2xl border border-border bg-card p-7 shadow-sm md:p-8">
        <p className="text-sm leading-6 text-muted-foreground">
          This reset link is missing its token. Request a new one below.
        </p>
        <Link
          href="/forgot-password"
          className="text-sm font-semibold text-foreground underline-offset-4 hover:underline"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form
      className="grid gap-5 rounded-2xl border border-border bg-card p-7 shadow-sm md:p-8"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        if (password !== confirmPassword) {
          setError("Passwords don't match.");
          return;
        }
        setStatus("loading");
        try {
          const res = await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, password }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error ?? "Reset failed");
            setStatus("idle");
            return;
          }
          router.push("/dashboard");
          router.refresh();
        } catch {
          setError("Network error. Try again.");
          setStatus("idle");
        }
      }}
    >
      <Field
        id="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        helper="At least 8 characters."
      />
      <Field
        id="confirmPassword"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        required
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      {error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="h-12" loading={status === "loading"}>
        {status === "loading" ? "Resetting…" : "Reset password"}
      </Button>
    </form>
  );
}
