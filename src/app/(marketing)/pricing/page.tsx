import type { Metadata } from "next";
import { PricingCards } from "@/components/site/pricing-cards";
import { Reveal } from "@/components/site/reveal";

export const metadata: Metadata = {
  title: "Pricing",
};

const faqs = [
  {
    q: "Can I switch plans later?",
    a: "Yes. Upgrade or downgrade from your account at any time. The new price applies to the next billing year.",
  },
  {
    q: "What does the Free revenue share mean?",
    a: "On Free, you can optionally share 10% of royalties in exchange for distribution support. Starter and Pro always keep 100%.",
  },
  {
    q: "How fast do releases go live?",
    a: "Most releases are live on major stores within 24-48 hours. Pro gets priority review when the queue is busy.",
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-6 pt-16 md:pt-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            Pricing
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-6xl">
            Pay yearly. Keep the royalties.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Free to start. Starter and Pro check out with Stripe during
            sign-up.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 md:py-24">
        <PricingCards />
      </section>

      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-3xl px-6 py-20 md:py-24">
          <Reveal>
            <h2 className="text-center text-3xl font-extrabold tracking-tight">
              Common questions
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-5">
            {faqs.map((faq, index) => (
              <Reveal key={faq.q} delay={index * 0.06}>
                <div className="rounded-2xl border border-border bg-background p-7 shadow-sm">
                  <h3 className="font-bold">{faq.q}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
