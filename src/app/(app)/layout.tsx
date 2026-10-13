import { redirect } from "next/navigation";
import { getOptionalUser, getPrimaryWorkspace } from "@/lib/auth/authorize";
import { ensurePrimaryWorkspace } from "@/lib/auth/authorize";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/app/AppShell";

export const dynamic = "force-dynamic";

/**
 * Authenticated application shell.
 *
 * Authentication is enforced here on the server (and again in middleware for
 * a fast redirect), and the workspace is resolved from membership — never from
 * anything the client supplies.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getOptionalUser().catch(() => null);
  if (!user) redirect("/sign-in?callbackUrl=/dashboard");

  const membership = (await getPrimaryWorkspace(user.id)) ?? (await ensurePrimaryWorkspace(user));

  const usage = await prisma.usageRecord.aggregate({
    where: {
      workspaceId: membership.workspaceId,
      kind: "ai_generation",
      createdAt: { gte: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)) },
    },
    _sum: { amount: true },
  });

  return (
    <AppShell
      user={{ name: user.name ?? user.email, email: user.email, image: user.image }}
      workspace={{
        id: membership.workspace.id,
        name: membership.workspace.name,
        slug: membership.workspace.slug,
        plan: membership.workspace.plan,
      }}
      role={membership.role}
      creditsUsed={usage._sum.amount ?? 0}
    >
      {children}
    </AppShell>
  );
}
