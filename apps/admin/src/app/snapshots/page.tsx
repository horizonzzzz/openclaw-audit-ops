import { Alert, Card, Descriptions, Empty } from "antd";
import { redirect } from "next/navigation";
import { AdminShell } from "../../components/admin-shell";
import { getSnapshots } from "../../lib/server/audit-service";
import { hasValidSession } from "../../lib/server/auth";

export const dynamic = "force-dynamic";

export default async function SnapshotsPage() {
  if (!(await hasValidSession())) {
    redirect("/login");
  }

  let snapshots: Awaited<ReturnType<typeof getSnapshots>> | null = null;

  try {
    snapshots = await getSnapshots();
  } catch {}

  return (
    <AdminShell title="配置快照" subtitle="查看插件在 SQLite 中保留的当前配置与规则快照。">
      <Alert showIcon type="info" message="快照数据来自插件运行时写入的 SQLite，不直接读取宿主配置文件。" />
      {!snapshots?.settings && !snapshots?.rules ? (
        <Card>
          <Empty description="当前没有可展示的快照数据" />
        </Card>
      ) : (
        <>
          <Card title="插件配置快照">
            {snapshots?.settings ? (
              <Descriptions
                column={1}
                bordered
                size="small"
                items={[
                  {
                    key: "settings-key",
                    label: "快照键",
                    children: snapshots.settings.snapshot_key
                  },
                  {
                    key: "settings-time",
                    label: "采集时间",
                    children: snapshots.settings.captured_at
                  },
                  {
                    key: "settings-payload",
                    label: "配置内容",
                    children: (
                      <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontFamily: "monospace" }}>
                        {snapshots.settings.payload}
                      </pre>
                    )
                  }
                ]}
              />
            ) : (
              <Empty description="无配置快照" />
            )}
          </Card>
          <Card title="规则快照">
            {snapshots?.rules ? (
              <Descriptions
                column={1}
                bordered
                size="small"
                items={[
                  {
                    key: "rules-key",
                    label: "快照键",
                    children: snapshots.rules.snapshot_key
                  },
                  {
                    key: "rules-time",
                    label: "采集时间",
                    children: snapshots.rules.captured_at
                  },
                  {
                    key: "rules-payload",
                    label: "规则内容",
                    children: (
                      <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontFamily: "monospace" }}>
                        {snapshots.rules.payload}
                      </pre>
                    )
                  }
                ]}
              />
            ) : (
              <Empty description="无规则快照" />
            )}
          </Card>
        </>
      )}
    </AdminShell>
  );
}
