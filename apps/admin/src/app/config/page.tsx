import { Alert, Button, Card, Input, Space } from "antd";
import { redirect } from "next/navigation";
import { AdminShell } from "../../components/admin-shell";
import { getRuntimeConfig } from "../../lib/server/audit-service";
import { hasValidSession } from "../../lib/server/auth";
import { formatModeLabel } from "../../lib/ui/labels";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  if (!(await hasValidSession())) {
    redirect("/login");
  }

  let payload = "{}";
  let modeText = "未读取";

  try {
    const result = await getRuntimeConfig();
    payload = JSON.stringify(result.config, null, 2);
    modeText = formatModeLabel(result.config.mode);
  } catch {}

  return (
    <AdminShell title="插件配置" subtitle="编辑 ~/.openclaw/openclaw.json 中实际生效的 Audit Ops 运行时配置。">
      <Alert
        showIcon
        type="warning"
        message={`当前配置按 JSON 原文编辑，读取到的模式为：${modeText}。保存前请确认结构合法。`}
      />
      <Card title="运行时配置 JSON" extra={<span style={{ color: "rgba(0, 0, 0, 0.45)" }}>直接写回默认配置文件</span>}>
        <form action="/api/config" method="post">
          <Space orientation="vertical" size={16} style={{ display: "flex" }}>
            <Input.TextArea name="configJson" rows={24} defaultValue={payload} />
            <Button type="primary" htmlType="submit">
              保存配置
            </Button>
          </Space>
        </form>
      </Card>
    </AdminShell>
  );
}
