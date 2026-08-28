"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, PaperPlaneTilt } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";
import { SUPPORT_CATEGORIES } from "@/lib/support";

export function NewSupportTicketForm() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");

  return (
    <form className="overflow-hidden rounded-2xl border border-border bg-card" onSubmit={async (event) => {
      event.preventDefault(); setError(""); setStatus("loading");
      try {
        const response = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, category, body }) });
        const data = await response.json();
        if (!response.ok) { setError(data.error ?? "Could not create ticket"); setStatus("idle"); return; }
        router.push(`/dashboard/support/${data.ticket.id}`); router.refresh();
      } catch { setError("Network error"); setStatus("idle"); }
    }}>
      <div className="flex items-center gap-4 border-b border-border px-5 py-5 sm:px-7"><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><PaperPlaneTilt size={19} weight="duotone" /></div><div><h2 className="font-semibold">What can we help with?</h2><p className="mt-0.5 text-xs text-muted-foreground">A clear subject and a little context help us respond faster.</p></div></div>
      <div className="grid gap-5 p-5 sm:p-7 md:grid-cols-2">
        <div className="md:col-span-2"><Field id="subject" label="Subject" required value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={160} /></div>
        <Field id="category" label="Category" as="select" required value={category} onChange={(event) => setCategory(event.target.value)}>{SUPPORT_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Field>
        <div className="rounded-xl border border-border bg-muted/35 p-4 text-xs leading-5 text-muted-foreground"><p className="font-semibold text-foreground">Direct to RDISTRO Support</p><p className="mt-1">We will email you when the status changes or a team member replies.</p></div>
        <div className="md:col-span-2"><Field id="body" label="Message" as="textarea" required value={body} onChange={(event) => setBody(event.target.value)} helper="Include release names, dates, or error details when relevant." /></div>
        {error ? <p className="text-sm font-medium text-destructive md:col-span-2" role="alert">{error}</p> : null}
        <div className="flex items-center justify-between gap-4 border-t border-border pt-5 md:col-span-2"><p className="hidden text-xs text-muted-foreground sm:block">Replies stay in one private thread.</p><Button type="submit" className="h-10 px-5" loading={status === "loading"}>{status === "loading" ? "Sending…" : "Open ticket"}<ArrowRight size={15} weight="bold" /></Button></div>
      </div>
    </form>
  );
}
