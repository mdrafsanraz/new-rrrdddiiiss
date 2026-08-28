"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";
import { CheckCircle, LockKey } from "@phosphor-icons/react";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saved">("idle");

  return (
    <form
      className="overflow-hidden rounded-2xl border border-border bg-card"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        if (newPassword !== confirmPassword) {
          setError("New passwords don't match.");
          return;
        }
        setStatus("loading");
        const res = await fetch("/api/account/password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Update failed");
          setStatus("idle");
          return;
        }
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setStatus("saved");
      }}
    >
      <div className="flex items-center gap-3 border-b border-border px-5 py-5 sm:px-7">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <LockKey size={19} weight="duotone" />
        </div>
        <div>
          <h2 className="font-semibold">Password &amp; security</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Change the password used to sign in
          </p>
        </div>
      </div>
      <div className="grid gap-5 p-5 sm:p-7 md:grid-cols-2">
        <div className="md:col-span-2">
          <Field
            id="currentPassword"
            label="Current password"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <Field
          id="newPassword"
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
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
          <p className="text-sm font-medium text-destructive md:col-span-2" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex items-center gap-3 border-t border-border pt-5 md:col-span-2">
          <Button type="submit" className="h-10 px-5" loading={status === "loading"}>
            {status === "loading" ? "Updating…" : "Update password"}
          </Button>
          {status === "saved" ? (
            <span className="flex items-center gap-1.5 text-sm text-emerald-700">
              <CheckCircle size={15} weight="fill" />
              Password updated
            </span>
          ) : null}
        </div>
      </div>
    </form>
  );
}
