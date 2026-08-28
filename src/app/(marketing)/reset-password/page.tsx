import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/site/reset-password-form";
import { Reveal } from "@/components/site/reveal";

export const metadata: Metadata = {
  title: "Reset password",
};

export default function ResetPasswordPage() {
  return (
    <section className="mx-auto grid max-w-xl gap-10 px-6 py-16 md:py-24">
      <Reveal>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
          Reset password
        </p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">
          Choose a new password.
        </h1>
      </Reveal>
      <Reveal delay={0.1}>
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </Reveal>
    </section>
  );
}
