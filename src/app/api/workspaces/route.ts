import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, audit } from "@/lib/api";
import { resolveWorkspace } from "@/lib/api-workspace";
import { ensurePrimaryWorkspace } from "@/lib/auth/authorize";
import { getOptionalUser, HttpError } from "@/lib/auth/authorize";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** GET /api/workspaces — workspaces the signed-in user belongs to. */
export const GET = handler(async () => {
  const user = await getOptionalUser();
  if (!user) throw new HttpError(401, "Sign in to view your workspaces.", "unauthenticated");
  await ensurePrimaryWorkspace(user);

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { workspace: { include: { _count: { select: { stories: true, memberships: true } } } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    workspaces: memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      plan: m.workspace.plan,
      role: m.role,
      storyCount: m.workspace._count.stories,
      memberCount: m.workspace._count.memberships,
    })),
  });
});

const createSchema = z.object({ name: z.string().trim().min(2).max(80) });

/** POST /api/workspaces — create an additional workspace. */
export const POST = handler(async (req: Request) => {
  const user = await getOptionalUser();
  if (!user) throw new HttpError(401, "Sign in first.", "unauthenticated");
  const { name } = createSchema.parse(await req.json());

  const base = slugify(name) || "workspace";
  let slug = base;
  let n = 1;
  while (await prisma.workspace.findUnique({ where: { slug } })) slug = `${base}-${n++}`;

  const workspace = await prisma.workspace.create({
    data: {
      name,
      slug,
      ownerId: user.id,
      plan: "FREE",
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
  });
  await audit(workspace.id, user.id, "workspace.create", workspace.id, { name });
  return NextResponse.json({ workspace }, { status: 201 });
});

const updateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

/** PATCH /api/workspaces?id=... — rename or update settings (admin+). */
export const PATCH = handler(async (req: Request) => {
  const ctx = await resolveWorkspace(req, "ADMIN");
  const body = updateSchema.parse(await req.json());
  const workspace = await prisma.workspace.update({
    where: { id: ctx.workspace.id },
    data: {
      ...(body.name ? { name: body.name } : {}),
      ...(body.settings ? { settings: body.settings as object } : {}),
    },
  });
  await audit(ctx.workspace.id, ctx.userId, "workspace.update", workspace.id);
  return NextResponse.json({ workspace });
});
