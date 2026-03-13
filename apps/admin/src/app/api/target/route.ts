import { NextResponse } from "next/server";
import { requireSession } from "../../../lib/server/auth";
import { readTarget, writeTarget } from "../../../lib/server/target-store";

export async function GET() {
  await requireSession();
  return NextResponse.json(await readTarget());
}

export async function POST(request: Request) {
  await requireSession();
  const formData = await request.formData();
  await writeTarget({
    configPath: String(formData.get("configPath") ?? ""),
    stateDir: String(formData.get("stateDir") ?? "")
  });
  return NextResponse.redirect(new URL("/target", request.url), { status: 302 });
}

export async function PUT(request: Request) {
  await requireSession();
  const body = (await request.json()) as { configPath: string; stateDir: string };
  await writeTarget(body);
  return NextResponse.json({ ok: true });
}
