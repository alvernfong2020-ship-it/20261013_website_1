import { NextResponse } from "next/server";
import { registerUser } from "@/lib/auth/register";
import { handler, clientIp } from "@/lib/api";

export const POST = handler(async (req: Request) => {
  const body = await req.json();
  const user = await registerUser(body, clientIp(req));
  return NextResponse.json({ user }, { status: 201 });
});
