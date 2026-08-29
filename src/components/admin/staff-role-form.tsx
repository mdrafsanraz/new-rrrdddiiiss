"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const roles = ["super_admin", "admin", "reviewer", "support", "finance"];
export function StaffRoleForm({ id, initial }: { id: string; initial: string }) { const router = useRouter(); const [role, setRole] = useState(initial); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); return <div><div className="flex gap-2"><select value={role} onChange={(event) => setRole(event.target.value)} className="h-8 border border-border bg-background px-2 text-xs">{roles.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select><button type="button" disabled={busy || role === initial} onClick={async () => { if (!window.confirm(`Change this staff role to ${role.replaceAll("_", " ")}?`)) return; setBusy(true); setError(""); const response = await fetch(`/api/admin/admins/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ role }) }); const body = await response.json(); if (!response.ok) setError(body.error ?? "Could not change role."); else router.refresh(); setBusy(false); }} className="h-8 bg-foreground px-3 text-[10px] font-semibold text-background disabled:opacity-40">Save role</button></div>{error ? <p className="mt-1 text-[10px] text-red-700">{error}</p> : null}</div>; }
