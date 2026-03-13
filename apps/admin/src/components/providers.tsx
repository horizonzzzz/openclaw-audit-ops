"use client";

import type { ReactNode } from "react";
import { ConfigProvider, App as AntdApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import { adminTheme } from "../lib/ui/theme";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider locale={zhCN} theme={adminTheme}>
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}
