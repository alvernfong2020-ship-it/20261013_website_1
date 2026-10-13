"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo, ButtonLink } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/examples", label: "Examples" },
  { href: "/templates", label: "Templates" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/guides", label: "Guides" },
];

export function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-colors",
        scrolled ? "border-line bg-paper/85 backdrop-blur-md" : "border-transparent bg-paper",
      )}
    >
      <div className="container-wide flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="Scrollwright home" className="rounded-md">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                pathname.startsWith(item.href)
                  ? "bg-paper-sunken text-ink"
                  : "text-ink-soft hover:bg-paper-sunken hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {signedIn ? (
            <ButtonLink href="/dashboard" size="sm">
              Open studio
            </ButtonLink>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft hover:text-ink"
              >
                Sign in
              </Link>
              <ButtonLink href="/sign-up" size="sm">
                Start creating
              </ButtonLink>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="relative block h-3 w-4">
            <span
              className={cn(
                "absolute left-0 top-0 h-0.5 w-4 bg-ink transition-transform",
                open && "translate-y-1.5 rotate-45",
              )}
            />
            <span className={cn("absolute left-0 top-1.5 h-0.5 w-4 bg-ink transition-opacity", open && "opacity-0")} />
            <span
              className={cn(
                "absolute left-0 top-3 h-0.5 w-4 bg-ink transition-transform",
                open && "-translate-y-1.5 -rotate-45",
              )}
            />
          </span>
        </button>
      </div>

      {open && (
        <div id="mobile-nav" className="border-t border-line bg-paper md:hidden">
          <nav aria-label="Mobile" className="container-wide flex flex-col py-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-3 text-base font-medium text-ink hover:bg-paper-sunken"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-line pt-4">
              {signedIn ? (
                <ButtonLink href="/dashboard" className="w-full">
                  Open studio
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink href="/sign-in" variant="secondary" className="w-full">
                    Sign in
                  </ButtonLink>
                  <ButtonLink href="/sign-up" className="w-full">
                    Start creating
                  </ButtonLink>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
