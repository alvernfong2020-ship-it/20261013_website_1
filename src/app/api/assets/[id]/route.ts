import { NextResponse } from "next/server";
import { handler, audit } from "@/lib/api";
import { resolveWorkspace } from "@/lib/api-workspace";
import { getStorage } from "@/lib/storage";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/auth/authorize";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** DELETE /api/assets/[id] — remove an asset and its stored bytes. */
export const DELETE = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const ctx = await resolveWorkspace(req, "EDITOR");
  const asset = await prisma.asset.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
  if (!asset) throw new HttpError(404, "Asset not found.", "not_found");

  await getStorage().delete(asset.storageKey).catch(() => undefined);
  await prisma.asset.delete({ where: { id: asset.id } });
  await audit(ctx.workspace.id, ctx.userId, "asset.delete", id, { filename: asset.filename });

  return NextResponse.json({ ok: true });
});
