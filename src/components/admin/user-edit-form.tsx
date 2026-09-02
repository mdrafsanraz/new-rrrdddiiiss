"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";

export function AdminUserEditForm({
  userId,
  name,
  planId,
  artistLimitOverride,
  planArtistLimits,
}: {
  userId: string;
  name: string;
  planId: string;
  artistLimitOverride: number | null;
  planArtistLimits: Record<string, number | null>;
}) {
  const router = useRouter();
  const [formName, setFormName] = useState(name);
  const [formPlan, setFormPlan] = useState(planId);
  const [formArtistLimit, setFormArtistLimit] = useState(
    artistLimitOverride === null ? "" : String(artistLimitOverride)
  );
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  return (
    <form
      className="space-y-4 rounded-xl border border-border bg-card p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setOk(false);
        setStatus("loading");
        try {
          const res = await fetch(`/api/admin/users/${userId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: formName,
              planId: formPlan,
              artistLimitOverride:
                formArtistLimit === "" ? null : Number(formArtistLimit),
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error ?? "Update failed");
            setStatus("idle");
            return;
          }
          setOk(true);
          setStatus("idle");
          router.refresh();
        } catch {
          setError("Network error");
          setStatus("idle");
        }
      }}
    >
      <h2 className="text-sm font-semibold">Edit user</h2>
      <p className="text-xs text-muted-foreground">
        To grant admin access, use{" "}
        <a href="/admin/admins" className="font-medium underline-offset-4 hover:underline">
          Add admin
        </a>
        .
      </p>
      <Field
        id="name"
        label="Name"
        required
        value={formName}
        onChange={(e) => setFormName(e.target.value)}
      />
      <Field
        id="planId"
        label="Plan"
        as="select"
        value={formPlan}
        onChange={(e) => setFormPlan(e.target.value)}
      >
        <option value="free">Free</option>
        <option value="starter">Starter</option>
        <option value="pro">Pro</option>
      </Field>
      <Field
        id="artistLimitOverride"
        label="Artist limit override"
        type="number"
        min={0}
        inputMode="numeric"
        value={formArtistLimit}
        placeholder={
          planArtistLimits[formPlan] === null
            ? "Plan: Unlimited"
            : `Plan: ${planArtistLimits[formPlan]}`
        }
        helper="Leave blank to use the selected plan's artist limit. Set 0 to prevent new artist profiles."
        onChange={(e) => setFormArtistLimit(e.target.value)}
      />
      {error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {ok ? <p className="text-sm text-emerald-800">Saved.</p> : null}
      <Button type="submit" className="h-10 px-5" disabled={status === "loading"}>
        {status === "loading" ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
