import { NextResponse } from "next/server";
import { z } from "zod";
import { handler } from "@/lib/api";
import { requireUser, ensurePrimaryWorkspace } from "@/lib/auth/authorize";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const schema = z.object({
  goal: z.string().max(200).optional(),
  audience: z.string().max(200).optional(),
  style: z.enum(["editorial", "cinematic", "minimal", "bold", "paper"]).optional(),
  hasContent: z.boolean().optional(),
  storyType: z.string().max(40).optional(),
  completed: z.boolean().optional(),
  step: z.string().max(40).optional(),
});

/** GET /api/onboarding — current onboarding answers + completion state. */
export const GET = handler(async () => {
  const user = await requireUser();
  return NextResponse.json({
    onboarding: user.onboarding ?? {},
    completed: Boolean(user.onboardedAt),
  });
});

/**
 * POST /api/onboarding — persist progress.
 * Progress is saved incrementally so users can leave and return; the final
 * call (completed: true) stamps `onboardedAt`.
 */
export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const body = schema.parse(await req.json());

  const merged = {
    ...((user.onboarding as Record<string, unknown>) ?? {}),
    ...Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)),
  };

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      onboarding: merged as object,
      ...(body.completed ? { onboardedAt: new Date() } : {}),
    },
  });

  // Make sure a workspace exists by the time onboarding completes.
  if (body.completed) await ensurePrimaryWorkspace(updated);

  return NextResponse.json({
    onboarding: updated.onboarding,
    completed: Boolean(updated.onboardedAt),
  });
});
