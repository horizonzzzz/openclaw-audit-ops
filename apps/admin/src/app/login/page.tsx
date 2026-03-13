export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24
      }}
    >
      <div
        style={{
          width: 420,
          borderRadius: 20,
          background: "#fff",
          padding: 32,
          boxShadow: "0 18px 48px rgba(15, 23, 42, 0.10)",
          border: "1px solid #edf1f8"
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 30 }}>审计运维控制台</h1>
          <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.7 }}>
            登录后管理 Audit Ops 插件配置与 SQLite 审计数据。
          </p>
        </div>
        <form action="/api/auth/login" method="post">
          <div style={{ display: "grid", gap: 16 }}>
            <input
              name="password"
              type="password"
              placeholder="请输入管理台密码"
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid #d9e1ec",
                padding: "12px 14px",
                fontSize: 14
              }}
            />
            <button
              type="submit"
              style={{
                width: "100%",
                border: "none",
                borderRadius: 12,
                padding: "12px 14px",
                background: "#1677ff",
                color: "#fff",
                fontSize: 15,
                cursor: "pointer"
              }}
            >
              登录控制台
            </button>
          </div>
        </form>
        <p style={{ margin: "20px 0 0", color: "#6b7280", lineHeight: 1.7 }}>
          可通过 `ADMIN_PASSWORD` 和 `ADMIN_AUTH_SECRET` 覆盖默认开发配置。
        </p>
      </div>
    </div>
  );
}
