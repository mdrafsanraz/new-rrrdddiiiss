import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { FeatureArt } from "@/components/site/illustrations";
import { Reveal } from "@/components/site/reveal";
import { buttonVariants } from "@/components/ui/button-variants";
import { features } from "@/lib/site";
import { cn } from "@/lib/utils";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Features",
};

export default async function FeaturesPage() {
  const distributeHref = (await getSessionUser()) ? "/dashboard" : "/signup";
  return (
    <>
      <section className="mx-auto max-w-7xl px-6 pt-16 md:pt-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            Features
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-6xl">
            Built for the release, not the demo
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Stores, analytics, royalties, and review speed. Artist and admin
            tools connect to LabelGrid next.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 md:py-24">
        <div className="grid gap-8">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 0.05}>
              <article
                className={cn(
                  "grid items-center gap-10 rounded-3xl border border-border bg-card p-8 shadow-sm md:p-12 lg:grid-cols-2",
                  index % 2 === 1 && "lg:[&>*:first-child]:order-2"
                )}
              >
                <FeatureArt kind={feature.illustration} />
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight">
                    {feature.title}
                  </h2>
                  <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-muted-foreground">
                    {feature.copy}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-16 text-center">
          <Link href={distributeHref} className={cn(buttonVariants(), "h-12 px-7")}>
            Start distributing
            <ArrowRight className="size-4" weight="bold" />
          </Link>
        </Reveal>
      </section>
    </>
  );
}
