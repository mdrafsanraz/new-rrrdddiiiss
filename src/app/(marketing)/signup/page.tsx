import type { Metadata } from "next";
import { Suspense } from "react";
import {
  ChartLineUp,
  Globe,
  Lightning,
  Quotes,
} from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/site/reveal";
import { SignupFlow } from "@/components/site/signup-flow";

export const metadata: Metadata = {
  title: "Sign up",
};

const valueProps = [
  {
    icon: Lightning,
    copy: "Live on stores in 24-48 hours",
  },
  {
    icon: Globe,
    copy: "Spotify, Apple Music, TikTok, and 150+ more",
  },
  {
    icon: ChartLineUp,
    copy: "Analytics and artist tools included",
  },
];

export default function SignupPage() {
  return (
    <section className="mx-auto grid max-w-7xl items-start gap-14 px-6 py-16 md:py-24 lg:grid-cols-[0.9fr_1.1fr]">
      <Reveal className="lg:sticky lg:top-28">
        <h1 className="max-w-[16ch] text-4xl font-extrabold leading-[1.08] tracking-tight md:text-5xl">
          Distribute your music to 150+ platforms
        </h1>
        <p className="mt-5 max-w-[44ch] text-lg leading-relaxed text-muted-foreground">
          Create your account in minutes. Upload releases, track analytics, and
          collect royalties from one dashboard.
        </p>
        <ul className="mt-9 grid gap-4">
          {valueProps.map((item) => (
            <li key={item.copy} className="flex items-center gap-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="size-5" weight="fill" />
              </span>
              <span className="text-sm font-medium">{item.copy}</span>
            </li>
          ))}
        </ul>
        <figure className="mt-10 max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
          <Quotes
            className="size-6 text-primary"
            weight="fill"
            aria-hidden="true"
          />
          <blockquote className="mt-3 text-sm leading-relaxed">
            Signed up in five minutes. My single was live on Spotify the next
            day.
          </blockquote>
          <figcaption className="mt-4 flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              A
            </span>
            <span>
              <span className="block text-sm font-semibold">Alex Rivera</span>
              <span className="block text-xs text-muted-foreground">
                Independent artist
              </span>
            </span>
          </figcaption>
        </figure>
      </Reveal>
      <Reveal delay={0.1}>
        <Suspense
          fallback={
            <p className="rounded-2xl border border-border bg-card px-6 py-8 text-sm text-muted-foreground">
              Loading form…
            </p>
          }
        >
          <SignupFlow />
        </Suspense>
      </Reveal>
    </section>
  );
}
