import { cache } from "react";
import { auth } from "./index";
import { prisma } from "@/lib/db";
import type { Plan, Role } from "@prisma/client";

export { HttpError } from "@/lib/errors";
import { HttpError } from "@/lib/errors";

export const ROLE_RANK: Record<Role, number> = {
  VIEWER: 0,
  EDITOR: 1,
  ADMIN: 2,
  OWNER: 3,
};

/** Returns the authenticated user or throws 401. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new HttpError(401, "You must be signed in to do that.", "unauthenticated");
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) throw new HttpError(401, "Account not found.", "unauthenticated");
  return user;
}

/** Non-throwing variant for optional auth (e.g. analytics). */
export async function getOptionalUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}

export type WorkspaceContext = {
  workspace: {
    id: string;
    name: string;
    slug: string;
    ownerId: string;
    plan: Plan;
    settings: unknown;
  };
  role: Role;
  userId: string;
};

/**
 * Verifies the current user is a member of the workspace with at least the
 * required role. This is the single server-side source of truth for
 * workspace authorisation — never trust a workspaceId from the client.
 */
export async function requireWorkspaceAccess(
  workspaceId: string,
  minimumRole: Role = "VIEWER",
): Promise<WorkspaceContext> {
  const user = await requireUser();
  const membership = await prisma.membership.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
    include: { workspace: true },
  });
  if (!membership) {
    throw new HttpError(403, "You do not have access to this workspace.", "forbidden");
  }
  if (ROLE_RANK[membership.role] < ROLE_RANK[minimumRole]) {
    throw new HttpError(403, "Your role does not permit this action.", "insufficient_role");
  }
  return {
    workspace: {
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      ownerId: membership.workspace.ownerId,
      plan: membership.workspace.plan,
      settings: membership.workspace.settings,
    },
    role: membership.role,
    userId: user.id,
  };
}

/** Resolve a workspace by slug (used in public workspace routes). */
export async function requireWorkspaceBySlug(
  slug: string,
  minimumRole: Role = "VIEWER",
): Promise<WorkspaceContext> {
  const ws = await prisma.workspace.findUnique({ where: { slug } });
  if (!ws) throw new HttpError(404, "Workspace not found.", "not_found");
  return requireWorkspaceAccess(ws.id, minimumRole);
}

/** The user's default (first) workspace, creating one on demand. */
export const getPrimaryWorkspace = cache(async (userId: string) => {
  const existing = await prisma.membership.findFirst({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;
  return null;
});

export async function ensurePrimaryWorkspace(user: {
  id: string;
  name: string | null;
  email: string;
}) {
  const existing = await getPrimaryWorkspace(user.id);
  if (existing) return existing;

  const base = (user.name || user.email.split("@")[0] || "my")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24) || "my";

  let slug = `${base}-workspace`;
  let n = 1;
  while (await prisma.workspace.findUnique({ where: { slug } })) {
    slug = `${base}-workspace-${n++}`;
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: `${user.name || user.email.split("@")[0]}'s workspace`,
      slug,
      ownerId: user.id,
      plan: "FREE",
      memberships: {
        create: { userId: user.id, role: "OWNER" },
      },
    },
    include: { memberships: true },
  });

  return { ...workspace.memberships[0], workspace };
}
