export default function LoginPage() {
  return (
    <section className="panel stack" style={{ maxWidth: 420, margin: "80px auto 0" }}>
      <h1>Admin Login</h1>
      <form action="/api/auth/login" method="post" className="stack">
        <label>
          Password
          <input type="password" name="password" />
        </label>
        <button type="submit">Sign in</button>
      </form>
      <p className="muted">Use ADMIN_PASSWORD and ADMIN_AUTH_SECRET to override local defaults.</p>
    </section>
  );
}
