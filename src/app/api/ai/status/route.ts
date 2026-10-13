import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { providerStatus } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

/** GET /api/ai/status — exposes whether live AI is configured (never the keys). */
export const GET = handler(async () => {
  const status = providerStatus();
  return NextResponse.json({
    configured: status.configured,
    provider: status.provider,
    model: status.model,
    notice: status.notice,
  });
});
