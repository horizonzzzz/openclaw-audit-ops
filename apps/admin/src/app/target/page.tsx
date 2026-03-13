import { Alert, Button, Card, Descriptions, Input, Space } from "antd";
import { redirect } from "next/navigation";
import { AdminShell } from "../../components/admin-shell";
import { hasValidSession } from "../../lib/server/auth";
import { readTarget } from "../../lib/server/target-store";

export const dynamic = "force-dynamic";

export default async function TargetPage() {
  if (!(await hasValidSession())) {
    redirect("/login");
  }

  const target = await readTarget();

  return (
    <AdminShell title="目标环境" subtitle="指定当前管理的 OpenClaw 运行时配置文件和插件状态目录。">
      <Alert
        showIcon
        type="info"
        message="这里填写的是宿主环境的真实路径。管理台会根据状态目录自动定位 audit-ops.sqlite。"
      />
      <Card title="目标环境配置">
        <form action="/api/target" method="post">
          <Space orientation="vertical" size={16} style={{ display: "flex" }}>
            <div>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>运行时配置文件路径</div>
              <Input
                name="configPath"
                defaultValue={target?.configPath ?? ""}
                placeholder="例如：C:\\openclaw\\config.json"
              />
            </div>
            <div>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>插件状态目录</div>
              <Input
                name="stateDir"
                defaultValue={target?.stateDir ?? ""}
                placeholder="例如：C:\\openclaw\\state\\plugins\\audit-ops"
              />
            </div>
            <Button type="primary" htmlType="submit">
              保存目标环境
            </Button>
          </Space>
        </form>
      </Card>
      {target ? (
        <Card title="当前保存值">
          <Descriptions
            column={1}
            bordered
            size="small"
            items={[
              {
                key: "configPath",
                label: "运行时配置文件路径",
                children: target.configPath
              },
              {
                key: "stateDir",
                label: "插件状态目录",
                children: target.stateDir
              }
            ]}
          />
        </Card>
      ) : null}
    </AdminShell>
  );
}
