import Link from "next/link";
import { Logo } from "@/components/ui/primitives";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/examples", label: "Examples" },
      { href: "/templates", label: "Templates" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/widgets", label: "Interactive widgets" },
      { href: "/ai", label: "AI creation" },
      { href: "/integrations", label: "Integrations" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/guides", label: "Guides" },
      { href: "/pricing", label: "Pricing" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Get started",
    links: [
      { href: "/sign-up", label: "Create an account" },
      { href: "/sign-in", label: "Sign in" },
      { href: "/dashboard", label: "Studio" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms of service" },
      { href: "/privacy", label: "Privacy policy" },
      { href: "/privacy#cookies", label: "Cookies" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper-raised">
      <div className="container-wide grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-ink-soft">
            An editorial studio for scroll-driven stories. Turn documents, links and rough ideas into
            immersive narratives — no code required.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="eyebrow mb-4">{col.title}</h2>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href + l.label}>
                  <Link href={l.href} className="text-sm text-ink-soft hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="container-wide flex flex-col gap-3 py-6 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Scrollwright. An original demonstration product.</p>
          <p>
            Pricing shown is illustrative. AI generation falls back to a clearly labelled demo mode
            when no model provider is configured.
          </p>
        </div>
      </div>
    </footer>
  );
}
