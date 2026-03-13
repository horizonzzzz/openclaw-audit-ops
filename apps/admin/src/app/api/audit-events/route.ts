import { NextResponse } from "next/server";
import { requireSession } from "../../../lib/server/auth";
import { getEvents, removeEvents } from "../../../lib/server/audit-service";

export async function GET(request: Request) {
  await requireSession();
  const { searchParams } = new URL(request.url);
  return NextResponse.json(
    await getEvents({
      eventType: searchParams.get("eventType") ?? undefined,
      toolName: searchParams.get("toolName") ?? undefined,
      decision: searchParams.get("decision") ?? undefined,
      severity: searchParams.get("severity") ?? undefined,
      sessionKey: searchParams.get("sessionKey") ?? undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined
    })
  );
}

export async function DELETE(request: Request) {
  await requireSession();
  const body = (await request.json()) as { ids: number[] };
  return NextResponse.json({ deleted: await removeEvents(body.ids) });
}
