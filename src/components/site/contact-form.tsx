"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState("");

  if (status === "done") {
    return (
      <p
        className="rounded-2xl border border-border bg-card px-7 py-9 text-sm leading-relaxed shadow-sm"
        role="status"
      >
        Message received. We will reply to the email you left.
      </p>
    );
  }

  return (
    <form
      className="grid gap-5 rounded-2xl border border-border bg-card p-7 shadow-sm md:p-8"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        setStatus("loading");
        const form = new FormData(event.currentTarget);
        try {
          const res = await fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: form.get("name"),
              email: form.get("email"),
              message: form.get("message"),
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error ?? "Could not send your message. Try again.");
            setStatus("idle");
            return;
          }
          setStatus("done");
        } catch {
          setError("Network error. Try again.");
          setStatus("idle");
        }
      }}
    >
      <Field id="name" name="name" label="Name" autoComplete="name" required />
      <Field
        id="email"
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
      />
      <Field id="message" name="message" label="Message" as="textarea" required />
      {error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="h-12" disabled={status === "loading"}>
        {status === "loading" ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
