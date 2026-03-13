import { NextResponse } from "next/server";
import { requireSession } from "../../../lib/server/auth";
import { getRuntimeConfig, saveRuntimeConfig } from "../../../lib/server/audit-service";

export async function GET() {
  await requireSession();
  return NextResponse.json(await getRuntimeConfig());
}

export async function POST(request: Request) {
  await requireSession();
  const formData = await request.formData();
  const configJson = String(formData.get("configJson") ?? "{}");
  await saveRuntimeConfig(JSON.parse(configJson));
  return NextResponse.redirect(new URL("/config", request.url), { status: 302 });
}

export async function PUT(request: Request) {
  await requireSession();
  const body = await request.json();
  return NextResponse.json(await saveRuntimeConfig(body));
}
