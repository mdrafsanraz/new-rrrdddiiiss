import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/site/forgot-password-form";
import { Reveal } from "@/components/site/reveal";

export const metadata: Metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return (
    <section className="mx-auto grid max-w-xl gap-10 px-6 py-16 md:py-24">
      <Reveal>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
          Reset password
        </p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">
          Forgot your password?
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
          Enter your account email and we&apos;ll send a link to set a new one.
        </p>
      </Reveal>
      <Reveal delay={0.1}>
        <ForgotPasswordForm />
      </Reveal>
    </section>
  );
}
