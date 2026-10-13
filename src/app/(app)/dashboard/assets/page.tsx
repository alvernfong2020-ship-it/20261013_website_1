import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getOptionalUser, getPrimaryWorkspace } from "@/lib/auth/authorize";
import { AssetManager, type AssetItem } from "@/components/app/AssetManager";

export const metadata: Metadata = { title: "Assets" };
export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const user = await getOptionalUser();
  if (!user) redirect("/sign-in");
  const membership = await getPrimaryWorkspace(user.id);
  if (!membership) redirect("/onboarding");

  const rows = await prisma.asset.findMany({
    where: { workspaceId: membership.workspaceId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const assets: AssetItem[] = rows.map((a) => ({
    id: a.id,
    filename: a.filename,
    url: a.url,
    mimeType: a.mimeType,
    kind: a.kind,
    size: a.size,
    width: a.width,
    height: a.height,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl">Assets</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-soft">
        Uploaded media lives in object storage when configured, or on local disk in development. Uploads are
        validated by file type and size before they are stored.
      </p>
      <div className="mt-8">
        <AssetManager initialAssets={assets} />
      </div>
    </div>
  );
}
