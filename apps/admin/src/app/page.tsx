import Link from "next/link";
import { getHealth } from "../lib/server/audit-service";
import { hasValidSession } from "../lib/server/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  if (!(await hasValidSession())) {
    redirect("/login");
  }
  const health = await getHealth();

  return (
    <div className="stack">
      <section className="panel stack">
        <h1>Audit Ops Admin</h1>
        <p className="muted">Next.js full-stack console for runtime config and audit SQLite maintenance.</p>
        <div className="nav">
          <Link href="/config">Config</Link>
          <Link href="/events">Events</Link>
          <Link href="/target">Target</Link>
          <Link href="/snapshots">Snapshots</Link>
        </div>
      </section>

      <section className="panel stack">
        <h2>Health</h2>
        <pre>{JSON.stringify(health, null, 2)}</pre>
      </section>
    </div>
  );
}
