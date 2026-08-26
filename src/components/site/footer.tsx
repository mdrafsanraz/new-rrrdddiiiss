import Link from "next/link";
import { AsciiEqualizer } from "@/components/site/ascii-art";
import AnimatedBrandLogo from "@/components/site/logo";
import { navLinks, site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-[1.6fr_1fr_1fr]">
        <div className="space-y-4">
          <AnimatedBrandLogo
            href={null}
            className="h-10 md:h-11 w-auto"
            gradientId="footerWaveGradient"
          />
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Independent music distribution for artists and small labels. Upload
            once, reach the stores your listeners already use.
          </p>
        </div>
        <div className="space-y-4">
          <p className="text-sm font-semibold">Menu</p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-4">
          <p className="text-sm font-semibold">Account</p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>
              <Link
                href="/signup"
                className="transition-colors hover:text-foreground"
              >
                Sign up
              </Link>
            </li>
            <li>
              <Link
                href="/login"
                className="transition-colors hover:text-foreground"
              >
                Login
              </Link>
            </li>
            <li>
              <a
                href={`mailto:${site.email}`}
                className="transition-colors hover:text-foreground"
              >
                {site.email}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-6">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          <AsciiEqualizer bars={16} className="text-xs text-emerald-700/70" />
        </div>
      </div>
    </footer>
  );
}
