import type { ReactNode } from "react";
import { Providers } from "../components/providers";
import "./globals.css";

export const metadata = {
  title: "审计运维控制台",
  description: "管理 Audit Ops 插件运行时配置和 SQLite 审计数据"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
