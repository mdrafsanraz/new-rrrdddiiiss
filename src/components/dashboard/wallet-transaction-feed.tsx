"use client";

import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Receipt,
  ArrowCounterClockwise,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";

export type WalletFeedItem = {
  id: string;
  type: "royalty_credit" | "withdrawal" | "adjustment" | "reversal";
  direction: "credit" | "debit";
  amount: string;
  currency: string;
  title: string;
  description: string | null;
  status: string;
  sourceId: string;
  createdAt: string;
};

const money = (amount: string, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    Number(amount),
  );
const date = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));

export function WalletTransactionFeed({ items }: { items: WalletFeedItem[] }) {
  const reduceMotion = useReducedMotion();
  if (!items.length)
    return (
      <div className="border-t border-border py-14 text-center">
        <Receipt
          className="mx-auto text-muted-foreground"
          size={28}
          weight="duotone"
        />
        <p className="mt-3 text-sm font-semibold">No wallet activity</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Published royalties and withdrawal requests will appear here.
        </p>
      </div>
    );
  return (
    <ul className="divide-y divide-border border-t border-border">
      {items.map((item, index) => {
        const credit = item.direction === "credit";
        const href =
          item.type === "royalty_credit"
            ? `/dashboard/royalties/${item.sourceId}`
        : `/dashboard/wallet/transactions/${item.id}`;
        const Icon =
          item.type === "royalty_credit"
            ? ArrowDownLeft
            : item.type === "withdrawal"
              ? ArrowUpRight
              : item.type === "reversal"
                ? ArrowCounterClockwise
                : Clock;
        return (
          <motion.li
            key={item.id}
            initial={
              reduceMotion
                ? false
                : { opacity: 0, transform: "translateY(8px)" }
            }
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            transition={{
              duration: 0.3,
              delay: Math.min(index * 0.035, 0.28),
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Link
              href={href}
              className="group grid gap-3 py-4 transition-colors hover:bg-muted/35 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:px-3"
            >
              <span
                className={`grid size-10 place-items-center rounded-xl ${credit ? "bg-emerald-50 text-emerald-700" : "bg-muted text-foreground"}`}
              >
                <Icon size={18} weight="bold" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {item.title}
                </span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  {item.type === "royalty_credit"
                    ? "Royalty Credit"
                    : item.type.replaceAll("_", " ")}{" "}
                  · {date(item.createdAt)}
                </span>
              </span>
              <span className="pl-13 text-left sm:pl-0 sm:text-right">
                <span
                  className={`block text-sm font-semibold tabular-nums ${credit ? "text-emerald-700" : "text-foreground"}`}
                >
                  {credit ? "+" : "−"}
                  {money(item.amount, item.currency)}
                </span>
                <span
                  className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${["declined", "reversed"].includes(item.status) ? "bg-red-50 text-red-700" : item.status === "available" ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}
                >
                  {item.type === "royalty_credit" && item.status === "available"
                    ? "Credited"
                    : item.status}
                </span>
              </span>
            </Link>
          </motion.li>
        );
      })}
    </ul>
  );
}
