type Reference = string | { id: string } | null;

export function invoiceSubscriptionId(invoice: {
  subscription?: Reference;
  parent?: { subscription_details?: { subscription?: Reference } | null } | null;
}): string | null {
  const reference = invoice.parent?.subscription_details?.subscription ?? invoice.subscription;
  return typeof reference === "string" ? reference : reference?.id ?? null;
}

export function subscriptionPeriodEnd(subscription: {
  current_period_end?: number;
  items: { data: { current_period_end?: number }[] };
}): Date | null {
  const ends = subscription.items.data.map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0);
  if (!ends.length && subscription.current_period_end) ends.push(subscription.current_period_end);
  const end = ends.length ? new Date(Math.max(...ends) * 1000) : null;
  return end && Number.isFinite(end.getTime()) ? end : null;
}
