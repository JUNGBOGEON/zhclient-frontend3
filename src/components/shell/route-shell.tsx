"use client";

import { usePathname } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";

const PUBLIC_ROUTES = new Set(["/login"]);
const PUBLIC_PREFIXES = ["/auth/"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function RouteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isPublic(pathname)) {
    return <>{children}</>;
  }
  return <AppShell>{children}</AppShell>;
}
