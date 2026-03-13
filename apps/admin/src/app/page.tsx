import { Alert, Button, Card, Col, Descriptions, Result, Row, Space, Statistic, Tag } from "antd";
import { redirect } from "next/navigation";
import { AdminShell } from "../components/admin-shell";
import { getHealth } from "../lib/server/audit-service";
import { hasValidSession } from "../lib/server/auth";
import { formatStorageHealth } from "../lib/ui/labels";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!(await hasValidSession())) {
    redirect("/login");
  }

  const health = await getHealth();

  return (
    <AdminShell title="控制台总览" subtitle="集中查看插件接入状态、运行时配置健康度和审计数据入口。">
      {!health.configured ? (
        <Result
          status="warning"
          title="尚未配置目标环境"
          subTitle="请先填写 OpenClaw 运行时配置文件路径和插件状态目录。"
          extra={
            <Button type="primary" href="/target">
              去配置目标环境
            </Button>
          }
        />
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="目标环境" value={health.configured ? "已接入" : "未配置"} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="配置文件状态" value={health.configReadable ? "可读" : "不可读"} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="SQLite 状态" value={health.databaseReadable ? "可读" : "不可读"} />
          </Card>
        </Col>
      </Row>

      <Card>
        <Space orientation="vertical" size={12} style={{ display: "flex" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>当前环境健康度</h2>
          <Alert
            type={health.configReadable && health.databaseReadable ? "success" : "warning"}
            message={formatStorageHealth(health)}
            showIcon
          />
          {health.configured ? (
            <Descriptions
              column={1}
              bordered
              size="small"
              items={[
                {
                  key: "config",
                  label: "运行时配置文件",
                  children: (
                    <>
                      {health.configPath}{" "}
                      {health.configReadable ? <Tag color="success">可访问</Tag> : <Tag color="error">不可访问</Tag>}
                    </>
                  )
                },
                {
                  key: "db",
                  label: "审计数据库",
                  children: (
                    <>
                      {health.dbPath}{" "}
                      {health.databaseReadable ? <Tag color="success">可访问</Tag> : <Tag color="warning">待检查</Tag>}
                    </>
                  )
                }
              ]}
            />
          ) : null}
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="快速入口" extra={<Button type="link" href="/config">进入配置中心</Button>}>
            <Space wrap>
              <Button type="primary" href="/events">
                查看审计事件
              </Button>
              <Button href="/target">管理目标环境</Button>
              <Button href="/snapshots">查看配置快照</Button>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="运维说明">
            <p style={{ marginTop: 0 }}>
              该控制台用于维护 Audit Ops 插件运行时配置，并浏览宿主环境中保存的 SQLite 审计数据。
            </p>
            <p style={{ marginBottom: 0 }}>
              变更配置前请先确认目标路径指向的是当前生效的 OpenClaw 环境。
            </p>
          </Card>
        </Col>
      </Row>
    </AdminShell>
  );
}
