import { z } from "zod";
import { HttpError, requireWorkspaceAccess, ensurePrimaryWorkspace, getOptionalUser, type WorkspaceContext } from "@/lib/auth/authorize";
import type { Role } from "@prisma/client";

/**
 * Resolve the workspace a request is acting on.
 *
 * The client may pass `workspaceId`, but access is ALWAYS verified server-side
 * against membership — a forged id yields 403, never access. When no id is
 * given the user's primary workspace is used.
 */
export async function resolveWorkspace(
  req: Request,
  minimumRole: Role = "VIEWER",
  explicitWorkspaceId?: string,
): Promise<WorkspaceContext> {
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("workspaceId") ?? undefined;
  const workspaceId = explicitWorkspaceId ?? fromQuery;

  if (workspaceId) {
    return requireWorkspaceAccess(workspaceId, minimumRole);
  }

  const user = await getOptionalUser();
  if (!user) throw new HttpError(401, "You must be signed in to do that.", "unauthenticated");
  const membership = await ensurePrimaryWorkspace(user);
  if (!membership) throw new HttpError(404, "No workspace found.", "no_workspace");
  return requireWorkspaceAccess(membership.workspaceId, minimumRole);
}

export const idParam = z.string().min(1).max(64);
