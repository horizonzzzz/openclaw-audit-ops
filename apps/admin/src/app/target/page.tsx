import { readTarget } from "../../lib/server/target-store";
import { hasValidSession } from "../../lib/server/auth";
import { redirect } from "next/navigation";

export default async function TargetPage() {
  if (!(await hasValidSession())) {
    redirect("/login");
  }
  const target = await readTarget();

  return (
    <div className="stack">
      <div className="nav">
        <a href="/">Overview</a>
        <a href="/config">Config</a>
        <a href="/events">Events</a>
      </div>
      <section className="panel stack">
        <h1>Managed Target</h1>
        <form action="/api/target" method="post" className="stack">
          <label>
            Runtime config path
            <input name="configPath" defaultValue={target?.configPath ?? ""} />
          </label>
          <label>
            Plugin state directory
            <input name="stateDir" defaultValue={target?.stateDir ?? ""} />
          </label>
          <button type="submit">Save target</button>
        </form>
      </section>
    </div>
  );
}
