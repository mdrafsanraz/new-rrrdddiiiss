"use client";

import { useState } from "react";
import { Bank, CheckCircle, CurrencyDollar, PaypalLogo } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";
import { cn } from "@/lib/utils";

const METHODS = [
  { id: "bank_transfer", label: "Bank transfer", note: "Wire to your bank account", icon: Bank },
  { id: "paypal", label: "PayPal", note: "Send to your PayPal account", icon: PaypalLogo },
  { id: "wise", label: "Wise", note: "International payout via Wise", icon: CurrencyDollar },
] as const;

export type PayoutInitial = {
  method: string | null;
  email: string;
  wiseAccount: string;
  bankCurrency: string;
  bankName: string;
  bankAddress: string;
  bankCountry: string;
  accountHolderName: string;
  accountNumber: string;
  swiftBic: string;
};

export function PayoutSettingsForm({ initial }: { initial: PayoutInitial }) {
  const [method, setMethod] = useState(initial.method ?? "bank_transfer");
  const [email, setEmail] = useState(initial.email);
  const [wiseAccount, setWiseAccount] = useState(initial.wiseAccount);
  const [bankCurrency, setBankCurrency] = useState(initial.bankCurrency || "USD");
  const [bankName, setBankName] = useState(initial.bankName);
  const [bankAddress, setBankAddress] = useState(initial.bankAddress);
  const [bankCountry, setBankCountry] = useState(initial.bankCountry);
  const [accountHolderName, setAccountHolderName] = useState(initial.accountHolderName);
  const [accountNumber, setAccountNumber] = useState(initial.accountNumber);
  const [swiftBic, setSwiftBic] = useState(initial.swiftBic);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  const dirty = () => setStatus("idle");

  return (
    <form
      className="overflow-hidden rounded-2xl border border-border bg-card"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        setStatus("saving");
        const payload =
          method === "wise"
            ? { method, wiseAccount, currentPassword }
            : method === "paypal"
              ? { method, email, currentPassword }
              : {
                  method,
                  bankCurrency,
                  bankName,
                  bankAddress,
                  bankCountry,
                  accountHolderName,
                  accountNumber,
                  swiftBic: swiftBic || undefined,
                  currentPassword,
                };
        try {
          const response = await fetch("/api/account/payout", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await response.json();
          if (!response.ok) {
            setError(data.error ?? "Could not save payout settings");
            setStatus("idle");
            return;
          }
          setCurrentPassword("");
          setStatus("saved");
        } catch {
          setError("Network error");
          setStatus("idle");
        }
      }}
    >
      <div className="border-b border-border px-5 py-5 sm:px-7">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Payout destination</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">Where should earnings go?</h2>
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">Payouts are sent in USD once your available balance reaches $50.</p>
      </div>
      <div className="space-y-6 p-5 sm:p-7">
        <fieldset>
          <legend className="text-sm font-medium">
            Payout method <span className="text-destructive">*</span>
          </legend>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {METHODS.map((item) => {
              const Icon = item.icon;
              const active = method === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setMethod(item.id);
                    dirty();
                  }}
                  className={cn(
                    "cursor-pointer rounded-xl border p-4 text-left transition-[border-color,background-color,transform] active:translate-y-px",
                    active ? "border-primary bg-primary/[0.06]" : "border-border hover:border-primary/30 hover:bg-muted/35"
                  )}
                >
                  <Icon size={21} className={active ? "text-primary" : "text-muted-foreground"} weight="duotone" />
                  <span className="mt-3 block text-sm font-semibold">{item.label}</span>
                  <span className="mt-1 block text-[11px] leading-4 text-muted-foreground">{item.note}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {method === "wise" ? (
          <Field
            id="payout-wise-account"
            label="Wise tag or email"
            required
            value={wiseAccount}
            onChange={(event) => {
              setWiseAccount(event.target.value);
              dirty();
            }}
            helper="Your Wise account tag (e.g. @yourname) or the email linked to your Wise account."
          />
        ) : null}

        {method === "paypal" ? (
          <Field
            id="payout-paypal-email"
            label="PayPal email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              dirty();
            }}
            helper="Use the email connected to your PayPal account."
          />
        ) : null}

        {method === "bank_transfer" ? (
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              id="payout-bank-currency"
              label="Bank currency"
              as="select"
              required
              value={bankCurrency}
              onChange={(event) => {
                setBankCurrency(event.target.value);
                dirty();
              }}
            >
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
            </Field>
            <Field
              id="payout-bank-name"
              label="Bank name"
              required
              value={bankName}
              onChange={(event) => {
                setBankName(event.target.value);
                dirty();
              }}
            />
            <div className="md:col-span-2">
              <Field
                id="payout-bank-address"
                label="Bank address"
                required
                value={bankAddress}
                onChange={(event) => {
                  setBankAddress(event.target.value);
                  dirty();
                }}
              />
            </div>
            <Field
              id="payout-bank-country"
              label="Bank country"
              required
              value={bankCountry}
              onChange={(event) => {
                setBankCountry(event.target.value);
                dirty();
              }}
            />
            <Field
              id="payout-account-holder"
              label="Account owner's full name"
              required
              value={accountHolderName}
              onChange={(event) => {
                setAccountHolderName(event.target.value);
                dirty();
              }}
            />
            <Field
              id="payout-account-number"
              label={bankCurrency === "EUR" ? "Account number or IBAN" : "Account number"}
              required
              value={accountNumber}
              onChange={(event) => {
                setAccountNumber(event.target.value);
                dirty();
              }}
            />
            <Field
              id="payout-swift-bic"
              label="SWIFT/BIC"
              value={swiftBic}
              onChange={(event) => {
                setSwiftBic(event.target.value);
                dirty();
              }}
              helper="Optional."
            />
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          <Field
            id="payout-current-password"
            label="Current password"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
              dirty();
            }}
            helper="Required to protect payout destination changes."
          />
        </div>
        {error ? (
          <p className="text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
          <Button type="submit" className="h-10 px-5" loading={status === "saving"}>
            {status === "saving" ? "Saving…" : "Save payout settings"}
          </Button>
          {status === "saved" ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
              <CheckCircle size={15} weight="fill" /> Settings saved
            </span>
          ) : null}
        </div>
      </div>
    </form>
  );
}
