import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripe, planIdFromPriceId } from "@/lib/stripe";
import type { PlanId, SubscriptionStatus } from "@prisma/client";

export const runtime = "nodejs";

function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
      return "canceled";
    case "incomplete":
    case "incomplete_expired":
      return "incomplete";
    default:
      return "none";
  }
}

async function syncSubscription(sub: Stripe.Subscription) {
  const userId =
    sub.metadata?.rdistroUserId ??
    (typeof sub.customer === "string"
      ? (
          await prisma.user.findFirst({
            where: { stripeCustomerId: sub.customer },
          })
        )?.id
      : undefined);

  if (!userId) {
    console.warn("[stripe/webhook] No user for subscription", sub.id);
    return;
  }

  const priceId = sub.items.data[0]?.price?.id ?? null;
  const planFromMeta = sub.metadata?.planId as PlanId | undefined;
  const planId =
    planFromMeta === "starter" || planFromMeta === "pro"
      ? planFromMeta
      : planIdFromPriceId(priceId);

  const stripeStatus = mapStatus(sub.status);
  const entitled =
    stripeStatus === "active" || stripeStatus === "trialing" ? planId : "free";

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      stripeStatus,
      planId: entitled,
    },
  });
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) {
    return NextResponse.json(
      { error: "Stripe webhook not configured" },
      { status: 503 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (error) {
    console.error("[stripe/webhook] signature", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(sub);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { stripeSubscriptionId: sub.id },
              {
                stripeCustomerId:
                  typeof sub.customer === "string" ? sub.customer : undefined,
              },
            ],
          },
        });
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              planId: "free",
              stripeStatus: "canceled",
              stripeSubscriptionId: null,
              stripePriceId: null,
            },
          });
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("[stripe/webhook] handler", error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
