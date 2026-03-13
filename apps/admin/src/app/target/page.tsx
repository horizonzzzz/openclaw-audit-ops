import { Alert, Card, Descriptions, Tag } from "antd";
import { redirect } from "next/navigation";
import { AdminShell } from "../../components/admin-shell";
import { getHealth } from "../../lib/server/audit-service";
import { hasValidSession } from "../../lib/server/auth";
import { readTarget } from "../../lib/server/target-store";

export const dynamic = "force-dynamic";

export default async function TargetPage() {
  if (!(await hasValidSession())) {
    redirect("/login");
  }

  const target = await readTarget();
  const health = await getHealth();

  return (
    <AdminShell title="目标环境" subtitle="管理台默认使用当前用户的 ~/.openclaw 目录，不再需要手动填写路径。">
      <Alert
        showIcon
        type="info"
        message="配置文件固定读取 ~/.openclaw/openclaw.json，审计数据库固定读取 ~/.openclaw/audit-ops.sqlite。"
      />
      <Card title="默认路径">
        <Descriptions
          column={1}
          bordered
          size="small"
          items={[
            {
              key: "stateDir",
              label: "OpenClaw 状态目录",
              children: target.stateDir
            },
            {
              key: "configPath",
              label: "运行时配置文件",
              children: (
                <>
                  {target.configPath}{" "}
                  {health.configReadable ? <Tag color="success">可访问</Tag> : <Tag color="warning">未找到或不可读</Tag>}
                </>
              )
            },
            {
              key: "dbPath",
              label: "审计 SQLite 文件",
              children: (
                <>
                  {target.dbPath}{" "}
                  {health.databaseReadable ? <Tag color="success">可访问</Tag> : <Tag color="warning">未找到或不可读</Tag>}
                </>
              )
            }
          ]}
        />
      </Card>
      <Card title="说明">
        <p style={{ marginTop: 0 }}>
          当前 admin 不再维护单独的目标环境配置，所有页面都会直接使用当前登录用户 home 目录下的
          `~/.openclaw`。
        </p>
        <p style={{ marginBottom: 0 }}>
          如果 OpenClaw 尚未初始化，对应页面会提示配置文件或 SQLite 不可读，但不需要再手动录入路径。
        </p>
      </Card>
    </AdminShell>
  );
}
