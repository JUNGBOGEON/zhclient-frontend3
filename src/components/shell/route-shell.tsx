"use client";

import { usePathname } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";

const PUBLIC_ROUTES = new Set(["/login"]);
const PUBLIC_PREFIXES = ["/auth/"];

function isPublic(pathname: string): boolean {
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  if (PUBLIC_ROUTES.has(normalized)) return true;
  return PUBLIC_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function RouteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isPublic(pathname)) {
    return <>{children}</>;
  }
  return <AppShell>{children}</AppShell>;
}
