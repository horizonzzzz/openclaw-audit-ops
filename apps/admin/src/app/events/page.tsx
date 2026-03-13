import { getEvents } from "../../lib/server/audit-service";
import { hasValidSession } from "../../lib/server/auth";
import { redirect } from "next/navigation";

export default async function EventsPage() {
  if (!(await hasValidSession())) {
    redirect("/login");
  }
  let events = [] as Awaited<ReturnType<typeof getEvents>>;
  try {
    events = await getEvents({});
  } catch {}

  return (
    <div className="stack">
      <div className="nav">
        <a href="/">Overview</a>
        <a href="/target">Target</a>
        <a href="/config">Config</a>
        <a href="/api/audit-events/export">Export JSON</a>
      </div>
      <section className="panel stack">
        <h1>Audit Events</h1>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Occurred At</th>
              <th>Event</th>
              <th>Tool</th>
              <th>Decision</th>
              <th>Severity</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event: (typeof events)[number]) => (
              <tr key={event.id}>
                <td>{event.id}</td>
                <td>{event.occurredAt}</td>
                <td>{event.eventType}</td>
                <td>{event.toolName ?? "-"}</td>
                <td>{event.decision ?? "-"}</td>
                <td>{event.severity ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
