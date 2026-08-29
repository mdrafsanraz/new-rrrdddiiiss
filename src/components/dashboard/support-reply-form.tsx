"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LockKey, PaperPlaneTilt } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";

export function SupportReplyForm({ ticketId, closed, admin = false }: { ticketId: string; closed?: boolean; admin?: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [ticketStatus, setTicketStatus] = useState("answered");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");

  if (closed && !admin) return <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/50 p-5 text-sm text-muted-foreground"><LockKey className="mt-0.5 shrink-0" size={17} weight="duotone" /><p><span className="font-semibold text-foreground">This conversation is closed.</span><br />Open a new ticket if you still need help.</p></div>;
  const endpoint = admin ? `/api/admin/support/${ticketId}` : `/api/support/${ticketId}`;

  return (
    <form className="overflow-hidden rounded-2xl border border-border bg-card" onSubmit={async (event) => {
      event.preventDefault(); setError(""); setStatus("loading");
      try {
        const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(admin ? { body, status: ticketStatus } : { body }) });
        const data = await response.json();
        if (!response.ok) { setError(data.error ?? "Reply failed"); setStatus("idle"); return; }
        setBody(""); setStatus("idle"); router.refresh();
      } catch { setError("Network error"); setStatus("idle"); }
    }}>
      <div className="flex items-center gap-3 border-b border-border px-5 py-4"><div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><PaperPlaneTilt size={17} weight="duotone" /></div><div><h2 className="text-sm font-semibold">{admin ? "Reply as admin" : "Continue the conversation"}</h2><p className="mt-0.5 text-[11px] text-muted-foreground">{admin ? "Your response will be emailed to the artist." : "RDISTRO Support will be notified by email."}</p></div></div>
      <div className="space-y-4 p-5"><Field id="reply" label="Message" as="textarea" required value={body} onChange={(event) => setBody(event.target.value)} />{admin ? <Field id="status" label="Set status after reply" as="select" value={ticketStatus} onChange={(event) => setTicketStatus(event.target.value)}><option value="answered">Awaiting user</option><option value="in_progress">In progress</option><option value="open">Open</option><option value="resolved">Resolved</option><option value="closed">Closed</option></Field> : null}{error ? <p className="text-sm font-medium text-destructive" role="alert">{error}</p> : null}<Button type="submit" className="h-10 px-5" loading={status === "loading"}>{status === "loading" ? "Sending" : "Send reply"}<PaperPlaneTilt size={15} weight="bold" /></Button></div>
    </form>
  );
}
