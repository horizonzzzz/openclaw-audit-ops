"use client";

import type { ReactNode } from "react";
import {
  AppstoreOutlined,
  DatabaseOutlined,
  FileSearchOutlined,
  LoginOutlined,
  SettingOutlined
} from "@ant-design/icons";
import { Button, Layout, Menu, Space, Typography } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";

const { Header, Sider, Content } = Layout;

const items = [
  { key: "/", icon: <AppstoreOutlined />, label: <Link href="/">总览</Link> },
  { key: "/target", icon: <SettingOutlined />, label: <Link href="/target">目标环境</Link> },
  { key: "/config", icon: <SettingOutlined />, label: <Link href="/config">插件配置</Link> },
  { key: "/events", icon: <DatabaseOutlined />, label: <Link href="/events">审计事件</Link> },
  { key: "/snapshots", icon: <FileSearchOutlined />, label: <Link href="/snapshots">配置快照</Link> }
];

export function AdminShell({
  children,
  title,
  subtitle
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  const pathname = usePathname();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={248} theme="light" style={{ borderRight: "1px solid #edf1f8" }}>
        <div style={{ padding: "24px 20px 16px" }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            审计运维控制台
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ margin: "8px 0 0" }}>
            Audit Ops Admin
          </Typography.Paragraph>
        </div>
        <Menu mode="inline" selectedKeys={[pathname]} items={items} style={{ borderInlineEnd: "none" }} />
      </Sider>
      <Layout>
        <Header
          style={{
            background: "rgba(255,255,255,0.86)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid #edf1f8",
            padding: "16px 24px",
            height: "auto",
            lineHeight: "normal",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16
          }}
        >
          <div style={{ minWidth: 0 }}>
            <Typography.Title level={3} style={{ margin: 0, lineHeight: 1.2 }}>
              {title}
            </Typography.Title>
            {subtitle ? (
              <Typography.Text type="secondary" style={{ display: "block", marginTop: 6 }}>
                {subtitle}
              </Typography.Text>
            ) : null}
          </div>
          <form action="/api/auth/logout" method="post">
            <Button htmlType="submit" icon={<LoginOutlined />}>
              退出登录
            </Button>
          </form>
        </Header>
        <Content style={{ padding: 24 }}>
          <Space orientation="vertical" size={20} style={{ display: "flex" }}>
            {children}
          </Space>
        </Content>
      </Layout>
    </Layout>
  );
}
