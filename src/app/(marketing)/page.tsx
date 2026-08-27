import Link from "next/link";
import { ArrowRight, CheckCircle, Quotes } from "@phosphor-icons/react/dist/ssr";
import {
  AsciiCassette,
  AsciiEqualizer,
  AsciiTerminal,
} from "@/components/site/ascii-art";
import { ContactForm } from "@/components/site/contact-form";
import { FeatureGrid } from "@/components/site/feature-grid";
import { HeroIllustration } from "@/components/site/illustrations";
import { PricingCards } from "@/components/site/pricing-cards";
import { Reveal } from "@/components/site/reveal";
import { StoreTicker } from "@/components/site/store-ticker";
import { buttonVariants } from "@/components/ui/button-variants";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

const steps = [
  {
    n: "01",
    title: "Create the account",
    copy: "Pick Free, Starter, or Pro. Paid plans check out with Stripe in the same flow.",
    accent: "bg-[#6366f1]/10 text-[#6366f1]",
  },
  {
    n: "02",
    title: "Send the release",
    copy: "Artwork, audio, and metadata go out as one packet to every store you pick.",
    accent: "bg-[#a855f7]/10 text-[#a855f7]",
  },
  {
    n: "03",
    title: "Collect the royalties",
    copy: "Keep 100% on paid plans, or share 10% on Free if you want the extra hand.",
    accent: "bg-emerald-600/10 text-emerald-700",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="rdistro-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(70%_60%_at_50%_30%,black,transparent)]"
          aria-hidden="true"
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 py-14 md:gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14 lg:py-20">
          <Reveal className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1 font-mono text-[11px] font-semibold text-primary md:text-xs">
              <span aria-hidden="true">$</span>
              music distribution for independents
            </p>
            <h1 className="mt-5 text-balance text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.5rem]">
              Be on every store.{" "}
              <span className="bg-linear-to-r from-[#4f46e5] via-[#7c3aed] to-[#db2777] bg-clip-text text-transparent">
                Keep every split.
              </span>
            </h1>
            <p className="mt-5 max-w-[42ch] text-base leading-relaxed text-muted-foreground md:text-lg">
              Distribute to Spotify, Apple Music, and 42+ stores. Keep 100% of
              your rights and royalties.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className={cn(buttonVariants(), "h-11 px-6 text-sm md:h-12 md:px-7 md:text-base")}
              >
                Start distributing
                <ArrowRight className="size-4" weight="bold" />
              </Link>
              <Link
                href="/pricing"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-11 px-6 text-sm md:h-12 md:px-7 md:text-base"
                )}
              >
                See pricing
              </Link>
            </div>
            <p className="mt-5 flex items-center gap-2 text-sm font-medium text-emerald-700">
              <CheckCircle className="size-4.5" weight="fill" aria-hidden="true" />
              Free plan available. No card needed to start.
            </p>
          </Reveal>
          <Reveal delay={0.15} className="min-w-0">
            <HeroIllustration />
          </Reveal>
        </div>
      </section>

      <StoreTicker />

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs text-muted-foreground">
            ~/features
          </p>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">
            Built for the release, not the demo
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Stores, analytics, royalties, and review speed in one place.
          </p>
          <AsciiEqualizer
            bars={18}
            className="mt-7 text-lg text-primary/70"
          />
        </Reveal>
        <div className="mt-16">
          <FeatureGrid />
        </div>
        <Reveal className="mt-12 text-center">
          <Link
            href="/features"
            className={cn(buttonVariants({ variant: "outline" }), "h-11 px-6")}
          >
            Explore all features
            <ArrowRight className="size-4" weight="bold" />
          </Link>
        </Reveal>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-7xl gap-14 px-6 py-24 md:py-32 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <p className="font-mono text-xs text-muted-foreground">
              ~/how-it-works
            </p>
            <h2 className="mt-4 max-w-[12ch] text-4xl font-extrabold tracking-tight md:text-5xl">
              Three moves. Then it is live.
            </h2>
            <Link
              href="/signup"
              className={cn(buttonVariants(), "mt-8 h-12 px-6")}
            >
              Sign up
              <ArrowRight className="size-4" weight="bold" />
            </Link>
          </Reveal>
          <ol className="grid gap-5">
            {steps.map((step, index) => (
              <Reveal key={step.n} delay={index * 0.08}>
                <li className="grid gap-4 rounded-2xl border border-border bg-background p-7 shadow-sm md:grid-cols-[4rem_1fr] md:items-start">
                  <span
                    className={cn(
                      "grid size-11 place-items-center rounded-xl font-mono text-sm font-bold",
                      step.accent
                    )}
                  >
                    {step.n}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold tracking-tight">
                      {step.title}
                    </h3>
                    <p className="mt-2 max-w-[56ch] text-sm leading-relaxed text-muted-foreground">
                      {step.copy}
                    </p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs text-muted-foreground">
            ~/pricing
          </p>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">
            Pay yearly.{" "}
            <span className="text-emerald-700">Keep the royalties.</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Free to start. Upgrade when the catalog needs room.
          </p>
        </Reveal>
        <div className="mt-16">
          <PricingCards />
        </div>
      </section>

      {/* Testimonial */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center md:py-28">
          <Reveal>
            <Quotes
              className="mx-auto size-10 text-[#a855f7]"
              weight="fill"
              aria-hidden="true"
            />
            <blockquote className="mt-6 text-2xl font-semibold leading-snug tracking-tight md:text-3xl">
              Signed up in five minutes. My single was live on Spotify the next
              day, and the split with my producer just happened.
            </blockquote>
            <p className="mt-6 text-sm font-semibold">Alex Rivera</p>
            <p className="text-sm text-muted-foreground">Independent artist</p>
          </Reveal>
        </div>
      </section>

      {/* Contact */}
      <section className="mx-auto grid max-w-7xl items-start gap-14 px-6 py-24 md:py-32 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal>
          <p className="font-mono text-xs text-muted-foreground">
            ~/contact
          </p>
          <h2 className="mt-4 max-w-[14ch] text-4xl font-extrabold tracking-tight md:text-5xl">
            Questions? Talk to the desk.
          </h2>
          <p className="mt-5 max-w-[44ch] text-lg leading-relaxed text-muted-foreground">
            Catalog questions, label seats, or a release date that cannot slip.
            We also read {site.email}.
          </p>
          <AsciiCassette className="mt-10 text-[10px] text-muted-foreground sm:text-xs" />
        </Reveal>
        <Reveal delay={0.1}>
          <ContactForm />
        </Reveal>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden border-t border-border bg-foreground text-background">
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-[1fr_minmax(0,34rem)]">
          <div className="flex flex-col items-start gap-8">
            <h2 className="max-w-[18ch] text-3xl font-extrabold tracking-tight md:text-4xl">
              Ready when the mix is.
            </h2>
            <Link
              href="/signup"
              className={cn(buttonVariants(), "h-12 px-7 text-base")}
            >
              Start distributing
              <ArrowRight className="size-4" weight="bold" />
            </Link>
          </div>
          <AsciiTerminal />
        </div>
      </section>
    </>
  );
}
