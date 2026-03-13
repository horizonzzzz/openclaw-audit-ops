import { getSnapshots } from "../../lib/server/audit-service";
import { hasValidSession } from "../../lib/server/auth";
import { redirect } from "next/navigation";

export default async function SnapshotsPage() {
  if (!(await hasValidSession())) {
    redirect("/login");
  }
  let snapshots: Awaited<ReturnType<typeof getSnapshots>> | null = null;
  try {
    snapshots = await getSnapshots();
  } catch {}

  return (
    <div className="stack">
      <div className="nav">
        <a href="/">Overview</a>
        <a href="/target">Target</a>
        <a href="/config">Config</a>
        <a href="/events">Events</a>
      </div>
      <section className="panel stack">
        <h1>Snapshots</h1>
        <pre>{JSON.stringify(snapshots, null, 2)}</pre>
      </section>
    </div>
  );
}
