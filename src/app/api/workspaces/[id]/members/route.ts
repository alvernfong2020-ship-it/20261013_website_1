import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, audit } from "@/lib/api";
import { resolveWorkspace } from "@/lib/api-workspace";
import { prisma } from "@/lib/db";
import { entitlementsFor } from "@/lib/plans";
import { HttpError } from "@/lib/auth/authorize";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

/** GET /api/workspaces/[id]/members — list members. */
export const GET = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const ctx = await resolveWorkspace(req, "VIEWER", id);
  const members = await prisma.membership.findMany({
    where: { workspaceId: ctx.workspace.id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({
    members: members.map((m) => ({ id: m.id, role: m.role, user: m.user })),
    seats: entitlementsFor(ctx.workspace.plan).teamSeats,
  });
});

const addSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).default("EDITOR"),
});

/**
 * POST /api/workspaces/[id]/members — add an existing user by email.
 *
 * Invitations are not emailed in this environment; the user must already have
 * an account. The seat limit is enforced server-side against the plan.
 */
export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const ctx = await resolveWorkspace(req, "ADMIN", id);
  const body = addSchema.parse(await req.json());

  const ent = entitlementsFor(ctx.workspace.plan);
  if (!ent.teamCollaboration) {
    throw new HttpError(402, "Team collaboration is not included in this plan. Upgrade to invite members.", "plan_required");
  }
  const count = await prisma.membership.count({ where: { workspaceId: ctx.workspace.id } });
  if (count >= ent.teamSeats) {
    throw new HttpError(402, `This plan includes ${ent.teamSeats} seats. Upgrade to add more members.`, "seat_limit");
  }

  const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (!user) {
    throw new HttpError(404, "No account exists for that email. They need to sign up first.", "no_user");
  }

  const existing = await prisma.membership.findUnique({
    where: { workspaceId_userId: { workspaceId: ctx.workspace.id, userId: user.id } },
  });
  if (existing) throw new HttpError(409, "That person is already a member.", "already_member");

  const membership = await prisma.membership.create({
    data: { workspaceId: ctx.workspace.id, userId: user.id, role: body.role as Role },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });
  await audit(ctx.workspace.id, ctx.userId, "member.add", user.id, { role: body.role });
  return NextResponse.json({ member: { id: membership.id, role: membership.role, user: membership.user } }, { status: 201 });
});

const patchSchema = z.object({ userId: z.string(), role: z.enum(["ADMIN", "EDITOR", "VIEWER"]) });

/** PATCH — change a member's role. */
export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const ctx = await resolveWorkspace(req, "ADMIN", id);
  const body = patchSchema.parse(await req.json());
  if (body.userId === ctx.workspace.ownerId || body.userId === ctx.userId) {
    throw new HttpError(400, "You cannot change your own role.", "self_role");
  }
  const updated = await prisma.membership.update({
    where: { workspaceId_userId: { workspaceId: ctx.workspace.id, userId: body.userId } },
    data: { role: body.role as Role },
  });
  await audit(ctx.workspace.id, ctx.userId, "member.role", body.userId, { role: body.role });
  return NextResponse.json({ member: updated });
});

/** DELETE — remove a member. */
export const DELETE = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const ctx = await resolveWorkspace(req, "ADMIN", id);
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) throw new HttpError(422, "Specify the member to remove.", "missing_user");
  if (userId === ctx.workspace.ownerId) {
    throw new HttpError(400, "The workspace owner cannot be removed.", "owner_protected");
  }
  await prisma.membership.delete({
    where: { workspaceId_userId: { workspaceId: ctx.workspace.id, userId } },
  });
  await audit(ctx.workspace.id, ctx.userId, "member.remove", userId);
  return NextResponse.json({ ok: true });
});
