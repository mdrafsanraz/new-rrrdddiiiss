import assert from "node:assert/strict";
import test from "node:test";
import { invoiceSubscriptionId, subscriptionPeriodEnd } from "./webhook-data";

test("invoice subscription references support both webhook API versions", () => {
  assert.equal(invoiceSubscriptionId({ subscription: "sub_old" }), "sub_old");
  assert.equal(invoiceSubscriptionId({ parent: { subscription_details: { subscription: { id: "sub_new" } } } }), "sub_new");
  assert.equal(invoiceSubscriptionId({}), null);
});

test("period end supports legacy and current subscriptions without invalid dates", () => {
  const timestamp = 1800000000;
  assert.equal(subscriptionPeriodEnd({ current_period_end: timestamp, items: { data: [{}] } })?.getTime(), timestamp * 1000);
  assert.equal(subscriptionPeriodEnd({ items: { data: [{ current_period_end: timestamp }, { current_period_end: timestamp + 100 }] } })?.getTime(), (timestamp + 100) * 1000);
  assert.equal(subscriptionPeriodEnd({ items: { data: [{}] } }), null);
  assert.equal(subscriptionPeriodEnd({ items: { data: [{ current_period_end: NaN }] } }), null);
});
