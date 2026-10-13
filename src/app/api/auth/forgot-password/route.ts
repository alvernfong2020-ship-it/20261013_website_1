import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset } from "@/lib/auth/password-reset";
import { handler, clientIp } from "@/lib/api";

const schema = z.object({ email: z.string().email() });

export const POST = handler(async (req: Request) => {
  const { email } = schema.parse(await req.json());
  const result = await requestPasswordReset(email, clientIp(req));
  return NextResponse.json(result);
});
