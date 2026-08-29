"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";

export function AddAdminForms() {
  const router = useRouter();
  const [promoteEmail, setPromoteEmail] = useState("");
  const [promoteRole, setPromoteRole] = useState("reviewer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [createRole, setCreateRole] = useState("reviewer");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState<"promote" | "create" | null>(null);

  async function promote(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    setLoading("promote");
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: promoteEmail, role: promoteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Promote failed");
        setLoading(null);
        return;
      }
      setOk(`Promoted ${data.admin.email} to admin.`);
      setPromoteEmail("");
      setLoading(null);
      router.refresh();
    } catch {
      setError("Network error");
      setLoading(null);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    setLoading("create");
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role: createRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Create failed");
        setLoading(null);
        return;
      }
      setOk(`Created admin ${data.admin.email}.`);
      setName("");
      setEmail("");
      setPassword("");
      setLoading(null);
      router.refresh();
    } catch {
      setError("Network error");
      setLoading(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        onSubmit={promote}
        className="space-y-4 rounded-xl border border-border bg-card p-5"
      >
        <div>
          <h2 className="text-sm font-semibold">Promote existing user</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Enter the account email to grant admin access.
          </p>
        </div>
        <Field
          id="promoteEmail"
          label="User email"
          type="email"
          required
          value={promoteEmail}
          onChange={(e) => setPromoteEmail(e.target.value)}
        />
        <Field id="promoteRole" label="Staff role" as="select" value={promoteRole} onChange={(event) => setPromoteRole(event.target.value)}><option value="reviewer">Release reviewer</option><option value="support">Support agent</option><option value="finance">Finance manager</option><option value="admin">Administrator</option><option value="super_admin">Super admin</option></Field>
        <Button
          type="submit"
          className="h-10 px-5"
          disabled={loading !== null}
        >
          {loading === "promote" ? "Promoting…" : "Add as admin"}
        </Button>
      </form>

      <form
        onSubmit={create}
        className="space-y-4 rounded-xl border border-border bg-card p-5"
      >
        <div>
          <h2 className="text-sm font-semibold">Create new admin</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Creates a new account with admin role.
          </p>
        </div>
        <Field
          id="name"
          label="Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field id="createRole" label="Staff role" as="select" value={createRole} onChange={(event) => setCreateRole(event.target.value)}><option value="reviewer">Release reviewer</option><option value="support">Support agent</option><option value="finance">Finance manager</option><option value="admin">Administrator</option><option value="super_admin">Super admin</option></Field>
        <Field
          id="email"
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          id="password"
          label="Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          helper="At least 8 characters"
        />
        <Button
          type="submit"
          className="h-10 px-5"
          disabled={loading !== null}
        >
          {loading === "create" ? "Creating…" : "Create admin"}
        </Button>
      </form>

      {error ? (
        <p className="text-sm font-medium text-red-700 lg:col-span-2" role="alert">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="text-sm text-emerald-800 lg:col-span-2">{ok}</p>
      ) : null}
    </div>
  );
}
