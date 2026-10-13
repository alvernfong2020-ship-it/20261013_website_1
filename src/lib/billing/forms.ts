import { prisma } from "@/lib/db";
import { entitlementsFor } from "@/lib/plans";
import { HttpError } from "@/lib/auth/authorize";
import type { Plan } from "@prisma/client";

function startOfMonth() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** Enforces the monthly form-submission ceiling for a workspace's plan. */
export async function assertStoryFormAllowed(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { plan: true },
  });
  if (!workspace) throw new HttpError(404, "Workspace not found.", "not_found");
  const ent = entitlementsFor(workspace.plan as Plan);
  const used = await prisma.formSubmission.count({
    where: { workspaceId, createdAt: { gte: startOfMonth() }, status: { not: "spam" } },
  });
  if (used >= ent.formSubmissionsPerMonth) {
    // Fail closed but harmlessly: the visitor is told the form is unavailable.
    throw new HttpError(
      429,
      "This form has reached its monthly submission limit. Please try again next month.",
      "form_limit_reached",
    );
  }
}
