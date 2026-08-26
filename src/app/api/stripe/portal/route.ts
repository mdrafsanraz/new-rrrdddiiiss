import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { appUrl, getStripe, isStripeConfigured } from "@/lib/stripe";

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 503 }
    );
  }
  if (!user.stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe customer on this account yet." },
      { status: 400 }
    );
  }

  const stripe = getStripe()!;
  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: appUrl("/dashboard/subscription"),
  });

  return NextResponse.json({ url: portal.url });
}
