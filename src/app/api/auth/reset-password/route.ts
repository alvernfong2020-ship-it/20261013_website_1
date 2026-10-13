import { NextResponse } from "next/server";
import { z } from "zod";
import { resetPassword } from "@/lib/auth/password-reset";
import { handler } from "@/lib/api";

const schema = z.object({ token: z.string().min(10), password: z.string().min(8) });

export const POST = handler(async (req: Request) => {
  const { token, password } = schema.parse(await req.json());
  const result = await resetPassword(token, password);
  return NextResponse.json(result);
});
