import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AnalyticsIllustration } from "@/components/site/illustrations";
import { LoginForm } from "@/components/site/login-form";
import { Reveal } from "@/components/site/reveal";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Login",
};

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/dashboard");
  return (
    <section className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-16 md:py-24 lg:grid-cols-2">
      <Reveal>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
          Login
        </p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-6xl">
          Back to the catalog.
        </h1>
        <p className="mt-6 max-w-[42ch] text-lg leading-relaxed text-muted-foreground">
          The artist dashboard wires to LabelGrid next. This screen is ready
          for that token.
        </p>
        <AnalyticsIllustration className="mt-10 hidden max-w-md lg:block" />
      </Reveal>
      <Reveal delay={0.1}>
        <LoginForm />
      </Reveal>
    </section>
  );
}
