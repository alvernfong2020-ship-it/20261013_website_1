import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getOptionalUser, getPrimaryWorkspace } from "@/lib/auth/authorize";
import { entitlementsFor } from "@/lib/plans";
import { MembersManager } from "@/components/app/MembersManager";
import { Card } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Workspace settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getOptionalUser();
  if (!user) redirect("/sign-in");
  const membership = await getPrimaryWorkspace(user.id);
  if (!membership) redirect("/onboarding");

  const ent = entitlementsFor(membership.workspace.plan);
  const members = await prisma.membership.findMany({
    where: { workspaceId: membership.workspaceId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  const canManage = membership.role === "OWNER" || membership.role === "ADMIN";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl">Settings</h1>
      <nav className="mt-4 flex gap-4 text-sm" aria-label="Settings sections">
        <Link href="/dashboard/settings" className="font-medium text-ink">
          Workspace
        </Link>
        <Link href="/dashboard/settings/billing" className="text-ink-soft hover:text-ink">
          Billing &amp; usage
        </Link>
      </nav>

      <div className="mt-8 space-y-6">
        <Card className="p-5">
          <h2 className="font-display text-xl">Workspace</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="eyebrow">Name</dt>
              <dd className="mt-1 text-sm">{membership.workspace.name}</dd>
            </div>
            <div>
              <dt className="eyebrow">Slug</dt>
              <dd className="mt-1 text-sm">{membership.workspace.slug}</dd>
            </div>
            <div>
              <dt className="eyebrow">Plan</dt>
              <dd className="mt-1 text-sm capitalize">{membership.workspace.plan.toLowerCase().replace("_", "+")}</dd>
            </div>
            <div>
              <dt className="eyebrow">Your role</dt>
              <dd className="mt-1 text-sm capitalize">{membership.role.toLowerCase()}</dd>
            </div>
          </dl>
        </Card>

        <MembersManager
          workspaceId={membership.workspaceId}
          initialMembers={members.map((m) => ({ id: m.id, role: m.role, user: m.user }))}
          seats={ent.teamSeats}
          canManage={canManage}
          collaboration={ent.teamCollaboration}
          ownerId={membership.workspace.ownerId}
          currentUserId={user.id}
        />

        <Card className="p-5">
          <h2 className="font-display text-xl">Account</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="eyebrow">Name</dt>
              <dd className="mt-1 text-sm">{user.name || "—"}</dd>
            </div>
            <div>
              <dt className="eyebrow">Email</dt>
              <dd className="mt-1 text-sm">{user.email}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-ink-faint">
            Account deletion and self-service profile editing are not yet exposed in the UI.
          </p>
        </Card>
      </div>
    </div>
  );
}
