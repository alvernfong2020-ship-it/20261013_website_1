import { NextResponse } from "next/server";
import { handler, audit } from "@/lib/api";
import { resolveWorkspace } from "@/lib/api-workspace";
import { storeUpload, MAX_UPLOAD_BYTES } from "@/lib/storage";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/auth/authorize";

export const dynamic = "force-dynamic";

/** GET /api/assets — list workspace assets (optionally filtered by query). */
export const GET = handler(async (req: Request) => {
  const ctx = await resolveWorkspace(req, "VIEWER");
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const kind = url.searchParams.get("kind")?.trim();

  const assets = await prisma.asset.findMany({
    where: {
      workspaceId: ctx.workspace.id,
      ...(kind ? { kind } : {}),
      ...(q ? { filename: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ assets });
});

/** POST /api/assets — multipart upload with server-side validation. */
export const POST = handler(async (req: Request) => {
  const ctx = await resolveWorkspace(req, "EDITOR");

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength && contentLength > MAX_UPLOAD_BYTES + 4096) {
    throw new HttpError(413, `Uploads are limited to ${MAX_UPLOAD_BYTES / 1024 / 1024}MB.`, "too_large");
  }

  const form = await req.formData().catch(() => {
    throw new HttpError(400, "Expected a multipart form upload.", "bad_form");
  });
  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new HttpError(400, "No file was included in the upload.", "no_file");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const asset = await storeUpload({
    workspaceId: ctx.workspace.id,
    uploadedBy: ctx.userId,
    filename: file.name,
    mimeType: file.type,
    bytes,
  });

  await audit(ctx.workspace.id, ctx.userId, "asset.upload", asset.id, { filename: asset.filename });
  return NextResponse.json({ asset }, { status: 201 });
});
