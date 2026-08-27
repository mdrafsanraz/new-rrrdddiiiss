"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
    <form
      className="space-y-4 border border-border bg-card p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setStatus("loading");
        try {
          const res = await fetch("/api/support", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subject, category, body }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error ?? "Could not create ticket");
            setStatus("idle");
            return;
          }
          router.push(`/dashboard/support/${data.ticket.id}`);
          router.refresh();
        } catch {
          setError("Network error");
          setStatus("idle");
        }
      }}
    >
      <h2 className="text-sm font-semibold">New support ticket</h2>
      <Field
        id="subject"
        label="Subject"
        required
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        maxLength={160}
      />
      <Field
        id="category"
        label="Category"
        as="select"
        required
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        {SUPPORT_CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </Field>
      <Field
        id="body"
        label="Message"
        as="textarea"
        required
        value={body}
        onChange={(e) => setBody(e.target.value)}
        helper="Describe the issue. Our team replies in this thread."
      />
      {error ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="h-10 px-5" loading={status === "loading"}>
        {status === "loading" ? "Sending…" : "Open ticket"}
      </Button>
    </form>
  );
}
