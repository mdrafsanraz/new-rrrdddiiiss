import type { Metadata } from "next";
import Link from "next/link";
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
          Manage your catalog, track every release, and keep your music moving
          from one place.
        </p>
        <AnalyticsIllustration className="mt-10 hidden max-w-md lg:block" />
      </Reveal>
      <Reveal delay={0.1}>
        <div className="grid gap-4">
          <aside
            className="border border-amber-500/40 bg-amber-50 px-5 py-4 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100"
            aria-labelledby="existing-user-notice"
          >
            <p id="existing-user-notice" className="font-semibold">
              Existing RDISTRO user?
            </p>
            <p className="mt-1 text-sm leading-6">
              Please reset your password before signing in to the new platform.
            </p>
            <Link
              href="/forgot-password"
              className="mt-3 inline-flex text-sm font-semibold underline underline-offset-4 hover:no-underline"
            >
              Reset your password
            </Link>
          </aside>
          <LoginForm />
        </div>
      </Reveal>
    </section>
  );
}
