"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";
import { CheckCircle, UserCircle } from "@phosphor-icons/react";

type AccountFields = {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

export function EditAccountForm({ account }: { account: AccountFields }) {
  const router = useRouter();
  const [form, setForm] = useState(account);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saved">("idle");

  return (
    <form
      className="overflow-hidden rounded-2xl border border-border bg-card"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        setStatus("loading");
        const res = await fetch("/api/account", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Update failed");
          setStatus("idle");
          return;
        }
        setStatus("saved");
        router.refresh();
      }}
    >
      <div className="flex items-center gap-3 border-b border-border px-5 py-5 sm:px-7">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <UserCircle size={19} weight="duotone" />
        </div>
        <div>
          <h2 className="font-semibold">Personal details</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Information connected to your RDISTRO account
          </p>
        </div>
      </div>
      <div className="grid gap-5 p-5 sm:p-7 md:grid-cols-2">
        <Field
          id="name"
          label="Full name"
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <Field
          id="phone"
          label="Phone"
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />
        <div className="md:col-span-2">
          <Field
            id="addressLine1"
            label="Address line 1"
            autoComplete="address-line1"
            value={form.addressLine1}
            onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))}
          />
        </div>
        <div className="md:col-span-2">
          <Field
            id="addressLine2"
            label="Address line 2"
            autoComplete="address-line2"
            value={form.addressLine2}
            onChange={(e) => setForm((f) => ({ ...f, addressLine2: e.target.value }))}
          />
        </div>
        <Field
          id="city"
          label="City"
          autoComplete="address-level2"
          value={form.city}
          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
        />
        <Field
          id="region"
          label="State / region"
          autoComplete="address-level1"
          value={form.region}
          onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
        />
        <Field
          id="postalCode"
          label="Postal code"
          autoComplete="postal-code"
          value={form.postalCode}
          onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
        />
        <Field
          id="country"
          label="Country"
          autoComplete="country-name"
          value={form.country}
          onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
        />
        {error ? (
          <p className="text-sm font-medium text-destructive md:col-span-2" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex items-center gap-3 border-t border-border pt-5 md:col-span-2">
          <Button type="submit" className="h-10 px-5" loading={status === "loading"}>
            {status === "loading" ? "Saving…" : "Save changes"}
          </Button>
          {status === "saved" ? (
            <span className="flex items-center gap-1.5 text-sm text-emerald-700">
              <CheckCircle size={15} weight="fill" />
              Saved
            </span>
          ) : null}
        </div>
      </div>
    </form>
  );
}
