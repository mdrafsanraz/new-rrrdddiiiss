import type { Metadata } from "next";
import { EnvelopeSimple, Headset } from "@phosphor-icons/react/dist/ssr";
import { ContactForm } from "@/components/site/contact-form";
import { Reveal } from "@/components/site/reveal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
};

export default function ContactPage() {
  return (
    <section className="mx-auto grid max-w-7xl items-start gap-14 px-6 py-16 md:py-24 lg:grid-cols-[0.9fr_1.1fr]">
      <Reveal>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
          Contact
        </p>
        <h1 className="mt-4 max-w-[14ch] text-4xl font-extrabold tracking-tight md:text-6xl">
          Talk to the desk.
        </h1>
        <p className="mt-6 max-w-[44ch] text-lg leading-relaxed text-muted-foreground">
          Catalog questions, label seats, or a release date that cannot slip.
          Write us and we reply to the email you leave.
        </p>
        <div className="mt-10 grid gap-4">
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <EnvelopeSimple className="size-5" weight="fill" />
            </span>
            <div>
              <p className="text-sm font-semibold">Email</p>
              <a
                href={`mailto:${site.email}`}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {site.email}
              </a>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Headset className="size-5" weight="fill" />
            </span>
            <div>
              <p className="text-sm font-semibold">Support hours</p>
              <p className="text-sm text-muted-foreground">
                Monday to Friday, 9:00-18:00 UTC
              </p>
            </div>
          </div>
        </div>
      </Reveal>
      <Reveal delay={0.1}>
        <ContactForm />
      </Reveal>
    </section>
  );
}
