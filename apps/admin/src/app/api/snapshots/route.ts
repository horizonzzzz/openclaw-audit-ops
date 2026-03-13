import { NextResponse } from "next/server";
import { requireSession } from "../../../lib/server/auth";
import { getSnapshots } from "../../../lib/server/audit-service";

export async function GET() {
  await requireSession();
  return NextResponse.json(await getSnapshots());
}
