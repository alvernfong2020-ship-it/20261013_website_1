import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Deterministic SVG thumbnail for a template.
 *
 * Rendered from the template's own palette and section outline so the library
 * needs no external image assets and every card looks like the real thing.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tpl = await prisma.template.findUnique({ where: { slug } });
  if (!tpl) {
    return new NextResponse("Not found", { status: 404 });
  }

  const doc = tpl.document as {
    palette?: { paper?: string; ink?: string; accent?: string; line?: string };
    sections?: { type: string; heading?: string }[];
  };
  const palette = {
    paper: doc.palette?.paper ?? "#f7f4ef",
    ink: doc.palette?.ink ?? "#171614",
    accent: doc.palette?.accent ?? "#b4622b",
    line: doc.palette?.line ?? "#e2dcd1",
  };
  const sections = doc.sections?.slice(0, 7) ?? [];

  // A simple, recognisable wireframe of the story's section stack.
  const bars = sections
    .map((s, i) => {
      const y = 46 + i * 44;
      const h = s.type === "hero" ? 34 : s.type === "fullscreen-image" ? 30 : 24;
      const w = s.type === "hero" ? 300 : 120 + ((i * 53) % 200);
      const isMedia = ["fullscreen-image", "image-text", "gallery", "carousel"].includes(s.type);
      const fill = isMedia ? palette.line : palette.ink;
      return `<rect x="40" y="${y}" width="${w}" height="${h}" rx="5" fill="${fill}" opacity="${s.type === "hero" ? 0.9 : 0.16}"/>
      ${s.type === "hero" ? `<rect x="40" y="${y + 40}" width="200" height="8" rx="4" fill="${palette.ink}" opacity="0.25"/>` : ""}
      ${s.type === "cta" ? `<rect x="40" y="${y}" width="120" height="24" rx="12" fill="${palette.accent}"/>` : ""}`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="360" viewBox="0 0 400 360" role="img" aria-label="${escapeXml(tpl.title)} template preview">
  <rect width="400" height="360" fill="${palette.paper}"/>
  <rect x="0" y="0" width="400" height="4" fill="${palette.accent}"/>
  <text x="40" y="34" font-family="Georgia, serif" font-size="15" fill="${palette.ink}" opacity="0.55">${escapeXml(tpl.category)}</text>
  ${bars}
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] as string,
  );
}
