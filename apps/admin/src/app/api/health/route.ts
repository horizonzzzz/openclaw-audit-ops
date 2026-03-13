import { NextResponse } from "next/server";
import { requireSession } from "../../../lib/server/auth";
import { getHealth } from "../../../lib/server/audit-service";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireSession();
  return NextResponse.json(await getHealth());
}
