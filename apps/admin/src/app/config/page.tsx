import { getRuntimeConfig } from "../../lib/server/audit-service";
import { hasValidSession } from "../../lib/server/auth";
import { redirect } from "next/navigation";

export default async function ConfigPage() {
  if (!(await hasValidSession())) {
    redirect("/login");
  }
  let payload = "{}";
  try {
    const result = await getRuntimeConfig();
    payload = JSON.stringify(result.config, null, 2);
  } catch {}

  return (
    <div className="stack">
      <div className="nav">
        <a href="/">Overview</a>
        <a href="/target">Target</a>
        <a href="/events">Events</a>
      </div>
      <section className="panel stack">
        <h1>Runtime Plugin Config</h1>
        <form action="/api/config" method="post" className="stack">
          <textarea name="configJson" rows={24} defaultValue={payload} />
          <button type="submit">Save config</button>
        </form>
      </section>
    </div>
  );
}
