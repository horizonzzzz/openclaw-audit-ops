import { Button, Card, Empty, Table, Tag } from "antd";
import dayjs from "dayjs";
import { redirect } from "next/navigation";
import { AdminShell } from "../../components/admin-shell";
import { EventFilters } from "../../components/event-filters";
import { getEvents } from "../../lib/server/audit-service";
import { hasValidSession } from "../../lib/server/auth";
import { formatDecisionLabel, formatSeverityLabel } from "../../lib/ui/labels";

export const dynamic = "force-dynamic";

export default async function EventsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasValidSession())) {
    redirect("/login");
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const decision =
    typeof resolvedSearchParams.decision === "string" ? resolvedSearchParams.decision : undefined;
  const severity =
    typeof resolvedSearchParams.severity === "string" ? resolvedSearchParams.severity : undefined;
  const toolName =
    typeof resolvedSearchParams.toolName === "string" ? resolvedSearchParams.toolName : undefined;

  let events = [] as Awaited<ReturnType<typeof getEvents>>;

  try {
    events = await getEvents({ decision, severity, toolName });
  } catch {}

  return (
    <AdminShell title="审计事件" subtitle="查看 SQLite 中的审计记录，并按风险结果快速筛选。">
      <Card title="筛选条件" extra={<Button href="/api/audit-events/export">导出 JSON</Button>}>
        <EventFilters initialToolName={toolName} initialDecision={decision} initialSeverity={severity} />
      </Card>

      <Card title="事件列表">
        <Table
          rowKey="id"
          dataSource={events}
          locale={{ emptyText: <Empty description="暂无符合条件的审计事件" /> }}
          pagination={{ pageSize: 12 }}
          columns={[
            { title: "ID", dataIndex: "id", width: 80 },
            {
              title: "发生时间",
              dataIndex: "occurredAt",
              width: 180,
              render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm:ss")
            },
            { title: "事件类型", dataIndex: "eventType" },
            {
              title: "工具",
              dataIndex: "toolName",
              render: (value: string | null) => value ?? <span style={{ color: "rgba(0, 0, 0, 0.45)" }}>无</span>
            },
            {
              title: "处理结果",
              dataIndex: "decision",
              width: 120,
              render: (value: string | null) =>
                value ? (
                  <Tag color={value === "block" ? "error" : value === "alert" ? "warning" : "success"}>
                    {formatDecisionLabel(value)}
                  </Tag>
                ) : (
                  "-"
                )
            },
            {
              title: "风险等级",
              dataIndex: "severity",
              width: 120,
              render: (value: string | null) =>
                value ? (
                  <Tag
                    color={
                      value === "critical"
                        ? "error"
                        : value === "high"
                          ? "volcano"
                          : value === "medium"
                            ? "gold"
                            : "default"
                    }
                  >
                    {formatSeverityLabel(value)}
                  </Tag>
                ) : (
                  "-"
                )
            }
          ]}
        />
      </Card>
    </AdminShell>
  );
}
