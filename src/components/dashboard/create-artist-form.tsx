"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Plus, UserCirclePlus, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";

const EMPTY_FORM = { name: "", fullName: "", email: "", location: "", bioShort: "" };

export function CreateArtistForm() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && status !== "loading") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open, status]);

  return (
    <>
      <Button type="button" className="h-11 px-5" onClick={() => setOpen(true)}>
        <Plus size={16} weight="bold" /> Add artist
      </Button>
      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto p-4" role="dialog" aria-modal="true" aria-labelledby="create-artist-title">
            <motion.button type="button" aria-label="Close create artist window" className="absolute inset-0 bg-foreground/55 backdrop-blur-sm" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => status !== "loading" && setOpen(false)} />
            <motion.form
              className="relative my-6 w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-[0_35px_100px_color-mix(in_oklch,var(--foreground)_25%,transparent)]"
              initial={reduceMotion ? false : { opacity: 0, transform: "scale(.96) translateY(14px)" }}
              animate={{ opacity: 1, transform: "scale(1) translateY(0)" }}
              exit={{ opacity: 0, transform: "scale(.97) translateY(8px)" }}
              transition={{ type: "spring", bounce: 0.14, visualDuration: 0.45 }}
              onSubmit={async (event) => {
                event.preventDefault(); setError(""); setStatus("loading");
                try {
                  const res = await fetch("/api/artists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
                  const data = await res.json();
                  if (!res.ok) { setError(data.error ?? "Could not create artist"); setStatus("idle"); return; }
                  setForm(EMPTY_FORM); setStatus("idle"); setOpen(false); router.push(`/dashboard/artists/${data.artist.id}`); router.refresh();
                } catch { setError("Network error while creating the artist."); setStatus("idle"); }
              }}
            >
              <div className="relative border-b border-border px-6 py-6 sm:px-8">
                <div className="absolute right-0 top-0 size-48 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_70%)]" />
                <div className="relative flex items-start justify-between gap-4"><div className="flex items-center gap-4"><div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><UserCirclePlus size={22} weight="duotone" /></div><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">New identity</p><h2 id="create-artist-title" className="mt-1 text-xl font-semibold tracking-tight">Create artist profile</h2></div></div><button type="button" className="relative grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" onClick={() => setOpen(false)} aria-label="Close"><X size={18} weight="bold" /></button></div>
              </div>
              <div className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
                <Field id="artist-name" label="Artist name" required value={form.name} onChange={(e) => setForm((value) => ({ ...value, name: e.target.value }))} />
                <Field id="artist-legal-name" label="Legal name" value={form.fullName} onChange={(e) => setForm((value) => ({ ...value, fullName: e.target.value }))} />
                <Field id="artist-email" label="Contact email" type="email" value={form.email} onChange={(e) => setForm((value) => ({ ...value, email: e.target.value }))} />
                <Field id="artist-location" label="Location" value={form.location} onChange={(e) => setForm((value) => ({ ...value, location: e.target.value }))} />
                <div className="sm:col-span-2"><Field id="artist-bio" label="Short bio" as="textarea" value={form.bioShort} onChange={(e) => setForm((value) => ({ ...value, bioShort: e.target.value }))} helper="A concise profile note for your team. You can update this later." /></div>
                {error ? <p className="text-sm font-medium text-destructive sm:col-span-2" role="alert">{error}</p> : null}
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/35 px-6 py-4 sm:px-8"><Button type="button" variant="ghost" className="h-10 px-4" disabled={status === "loading"} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" className="h-10 px-5" loading={status === "loading"}>{status === "loading" ? "Creating…" : "Create artist"}</Button></div>
            </motion.form>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
