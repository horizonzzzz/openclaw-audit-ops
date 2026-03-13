import { NextResponse } from "next/server";
import { createSession, validatePassword } from "../../../../lib/server/auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");

  if (!validatePassword(password)) {
    return NextResponse.redirect(new URL("/login", request.url), { status: 302 });
  }

  await createSession(password);
  return NextResponse.redirect(new URL("/", request.url), { status: 302 });
}
