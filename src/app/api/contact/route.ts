import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, clientIp, rateLimitOrThrow } from "@/lib/api";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  message: z.string().trim().min(10).max(6000),
  company: z.string().max(200).optional(),
  consent: z.boolean(),
});

/**
 * POST /api/contact
 *
 * The marketing contact form. Delivery requires a mail provider, which is not
 * configured here — in that case we return 503 with an explicit message rather
 * than a fake "sent" success.
 */
export const POST = handler(async (req: Request) => {
  rateLimitOrThrow(`contact:${clientIp(req) ?? "anon"}`, 6, 60 * 60 * 1000);
  const body = schema.parse(await req.json());

  if (body.company) {
    return NextResponse.json({ ok: true });
  }
  if (!body.consent) {
    return NextResponse.json({ error: "Please accept the consent checkbox." }, { status: 422 });
  }

  const mailConfigured = Boolean(process.env.MAIL_WEBHOOK_URL);
  if (!mailConfigured) {
    return NextResponse.json(
      {
        error: "Message delivery is not configured on this server.",
        code: "mail_not_configured",
        hint: "Set MAIL_WEBHOOK_URL (or wire a transactional email provider) to enable contact delivery.",
      },
      { status: 503 },
    );
  }

  const res = await fetch(process.env.MAIL_WEBHOOK_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: "hello@scrollwright.example", ...body }),
  });
  if (!res.ok) {
    return NextResponse.json({ error: "The mail provider rejected the message." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
});
