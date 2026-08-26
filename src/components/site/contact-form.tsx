"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

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
      onSubmit={(event) => {
        event.preventDefault();
        setStatus("loading");
        window.setTimeout(() => setStatus("done"), 700);
      }}
    >
      <Field id="name" label="Name" autoComplete="name" required />
      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
      />
      <Field id="message" label="Message" as="textarea" required />
      <Button type="submit" className="h-12" disabled={status === "loading"}>
        {status === "loading" ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
