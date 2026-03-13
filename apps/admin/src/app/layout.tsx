import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Audit Ops Admin",
  description: "Manage Audit Ops runtime config and SQLite data"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">{children}</div>
      </body>
    </html>
  );
}
