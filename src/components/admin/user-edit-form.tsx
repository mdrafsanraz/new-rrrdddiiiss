"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";

export function AdminUserEditForm({
  userId,
  name,
  planId,
  role,
}: {
  userId: string;
  name: string;
  planId: string;
  role: string;
}) {
  const router = useRouter();
  const [formName, setFormName] = useState(name);
  const [formPlan, setFormPlan] = useState(planId);
  const [formRole, setFormRole] = useState(role);
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
              role: formRole,
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
        id="role"
        label="Role"
        as="select"
        value={formRole}
        onChange={(e) => setFormRole(e.target.value)}
      >
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </Field>
      {error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="text-sm text-emerald-800">Saved.</p>
      ) : null}
      <Button type="submit" className="h-10 px-5" disabled={status === "loading"}>
        {status === "loading" ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
