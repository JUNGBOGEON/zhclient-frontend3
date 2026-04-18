import type { Metadata } from "next";

import { RootProviders } from "@/components/providers/root-providers";
import { RouteShell } from "@/components/shell/route-shell";

import "./globals.css";

export const metadata: Metadata = {
  title: "ZH Nexus",
  description: "좀비고등학교 통합 어드민 콘솔",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full bg-[#121212] text-white">
        <RootProviders>
          <RouteShell>{children}</RouteShell>
        </RootProviders>
      </body>
    </html>
  );
}
