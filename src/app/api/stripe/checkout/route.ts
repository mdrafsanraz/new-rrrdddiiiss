import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  appUrl,
  getStripe,
  isStripeConfigured,
  priceIdForPlan,
} from "@/lib/stripe";
import type { PlanId } from "@prisma/client";

const schema = z.object({
  planId: z.enum(["starter", "pro"]),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Stripe is not configured. Set STRIPE_SECRET_KEY and price IDs in .env.",
      },
      { status: 503 }
    );
  }

  try {
    const body = schema.parse(await request.json());
    const planId = body.planId as PlanId;
    const priceId = priceIdForPlan(planId);
    if (!priceId) {
      return NextResponse.json(
        { error: `Missing Stripe price for ${planId}.` },
        { status: 503 }
      );
    }

    const stripe = getStripe()!;
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { rdistroUserId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: appUrl("/dashboard/settings/subscription?checkout=success"),
      cancel_url: appUrl("/dashboard/settings/subscription?checkout=cancel"),
      client_reference_id: user.id,
      metadata: {
        rdistroUserId: user.id,
        planId,
      },
      subscription_data: {
        metadata: {
          rdistroUserId: user.id,
          planId,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[stripe/checkout]", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
