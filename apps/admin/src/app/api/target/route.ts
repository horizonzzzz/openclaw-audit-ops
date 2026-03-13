import { NextResponse } from "next/server";
import { requireSession } from "../../../lib/server/auth";
import { readTarget } from "../../../lib/server/target-store";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireSession();
  return NextResponse.json(await readTarget());
}
