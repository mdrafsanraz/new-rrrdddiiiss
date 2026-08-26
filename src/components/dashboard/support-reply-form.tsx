"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";

export function SupportReplyForm({
  ticketId,
  closed,
  admin = false,
}: {
  ticketId: string;
  closed?: boolean;
  admin?: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [ticketStatus, setTicketStatus] = useState("answered");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");

  if (closed && !admin) {
    return (
      <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
        This ticket is closed. Open a new one if you still need help.
      </p>
    );
  }

  const endpoint = admin
    ? `/api/admin/support/${ticketId}`
    : `/api/support/${ticketId}`;

  return (
    <form
      className="space-y-4 rounded-xl border border-border bg-card p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setStatus("loading");
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              admin
                ? { body, status: ticketStatus }
                : { body }
            ),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error ?? "Reply failed");
            setStatus("idle");
            return;
          }
          setBody("");
          setStatus("idle");
          router.refresh();
        } catch {
          setError("Network error");
          setStatus("idle");
        }
      }}
    >
      <h2 className="text-sm font-semibold">
        {admin ? "Reply as admin" : "Reply"}
      </h2>
      <Field
        id="reply"
        label="Message"
        as="textarea"
        required
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {admin ? (
        <Field
          id="status"
          label="Set status after reply"
          as="select"
          value={ticketStatus}
          onChange={(e) => setTicketStatus(e.target.value)}
        >
          <option value="answered">Answered</option>
          <option value="in_progress">In progress</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </Field>
      ) : null}
      {error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="h-10 px-5" disabled={status === "loading"}>
        {status === "loading" ? "Sending…" : "Send reply"}
      </Button>
    </form>
  );
}
