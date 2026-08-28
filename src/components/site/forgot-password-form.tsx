"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle");

  if (status === "sent") {
    return (
      <div className="grid gap-4 rounded-2xl border border-border bg-card p-7 shadow-sm md:p-8">
        <p className="text-sm leading-6 text-muted-foreground">
          If an account exists for <strong className="text-foreground">{email}</strong>,
          a reset link is on its way. Check your inbox.
        </p>
        <Link
          href="/login"
          className="text-sm font-semibold text-foreground underline-offset-4 hover:underline"
        >
          Back to login
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
        setStatus("loading");
        try {
          const res = await fetch("/api/auth/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error ?? "Request failed");
            setStatus("idle");
            return;
          }
          setStatus("sent");
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
      {error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="h-12" loading={status === "loading"}>
        {status === "loading" ? "Sending…" : "Send reset link"}
      </Button>
      <p className="text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-semibold text-foreground underline-offset-4 hover:underline"
        >
          Back to login
        </Link>
      </p>
    </form>
  );
}
