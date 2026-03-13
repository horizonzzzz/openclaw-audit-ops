import { requireSession } from "../../../../lib/server/auth";
import { downloadEvents } from "../../../../lib/server/audit-service";

export async function GET() {
  await requireSession();
  const payload = await downloadEvents();
  return new Response(payload, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="audit-events.json"'
    }
  });
}
