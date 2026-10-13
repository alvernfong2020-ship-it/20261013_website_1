"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Logo, Badge, Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { entitlementsFor } from "@/lib/plans";
import type { Plan, Role } from "@prisma/client";

type NavItem = { href: string; label: string; icon: string; exact?: boolean };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "▦", exact: true },
  { href: "/dashboard/stories", label: "Stories", icon: "▤" },
  { href: "/dashboard/templates", label: "Templates", icon: "◳" },
  { href: "/dashboard/assets", label: "Assets", icon: "▣" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "◔" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
];

export function AppShell({
  user,
  workspace,
  role,
  creditsUsed,
  children,
}: {
  user: { name: string; email: string; image: string | null };
  workspace: { id: string; name: string; slug: string; plan: Plan };
  role: Role;
  creditsUsed: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ent = entitlementsFor(workspace.plan);
  const creditsLimit = ent.aiCredits;

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Sidebar */}
      <aside
        id="app-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-line bg-paper-raised transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center border-b border-line px-5">
          <Link href="/" aria-label="Scrollwright home">
            <Logo />
          </Link>
        </div>
        <nav aria-label="Studio" className="flex flex-col gap-1 p-3">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper-sunken hover:text-ink",
                )}
              >
                <span aria-hidden="true" className="w-4 text-center">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mx-3 mt-2 rounded-lg border border-line bg-paper-sunken/60 p-3">
          <p className="eyebrow">Workspace</p>
          <p className="mt-1 truncate text-sm font-medium" title={workspace.name}>
            {workspace.name}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <Badge tone={workspace.plan === "FREE" ? "neutral" : "accent"}>{prettyPlan(workspace.plan)}</Badge>
            <span className="text-xs text-ink-faint">{role.toLowerCase()}</span>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-ink-faint">
              <span>AI credits</span>
              <span>
                {creditsUsed}/{creditsLimit === Infinity ? "∞" : creditsLimit}
              </span>
            </div>
            <div
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-label="AI credits used"
              aria-valuenow={creditsUsed}
              aria-valuemin={0}
              aria-valuemax={creditsLimit === Infinity ? 100 : creditsLimit}
            >
              <div
                className="h-full rounded-full bg-accent"
                style={{
                  width: `${creditsLimit === Infinity ? 5 : Math.min(100, (creditsUsed / creditsLimit) * 100)}%`,
                }}
              />
            </div>
          </div>
          <Link
            href="/dashboard/settings/billing"
            className="mt-3 block text-xs font-medium text-accent underline underline-offset-2"
          >
            Manage plan
          </Link>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-line bg-paper/90 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line lg:hidden"
            aria-expanded={open}
            aria-controls="app-sidebar"
            aria-label={open ? "Close navigation" : "Open navigation"}
            onClick={() => setOpen((v) => !v)}
          >
            ☰
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{user.name}</p>
              <p className="text-xs text-ink-faint">{user.email}</p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-sm text-paper" aria-hidden="true">
              {(user.name || user.email).slice(0, 1).toUpperCase()}
            </span>
            <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
              Sign out
            </Button>
          </div>
        </header>

        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

function prettyPlan(plan: Plan) {
  return (
    { FREE: "Free", STARTER: "Starter", PRO: "Pro", PRO_PLUS: "Pro+", ENTERPRISE: "Enterprise" } as Record<
      string,
      string
    >
  )[plan];
}
