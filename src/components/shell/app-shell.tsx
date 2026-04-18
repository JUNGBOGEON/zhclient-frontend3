"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/ui/brand-mark";
import { useAuth } from "@/components/providers/auth-provider";

type NavItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: "/", label: "유저 검색" },
  { href: "/clans", label: "클랜" },
  { href: "/macros", label: "매크로" },
  { href: "/servers", label: "서버 상태" },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin/users", label: "관리자", adminOnly: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, status, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  const items = useMemo(() => {
    if (!user) return NAV;
    return user.role === "admin" ? [...NAV, ...ADMIN_NAV] : NAV;
  }, [user]);

  if (status === "loading" || status === "unauthenticated" || !user) {
    return <FullPageSpinner />;
  }

  if (user.status === "pending") {
    return <PendingGate userName={user.name} onLogout={logout} />;
  }

  if (user.status === "banned") {
    return <BannedGate userName={user.name} onLogout={logout} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#121212] text-white">
      <TopNav
        user={user}
        items={items}
        pathname={pathname}
        onLogout={logout}
        onOpenDrawer={() => setDrawerOpen(true)}
      />
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        items={items}
        pathname={pathname}
        userName={user.name}
        onLogout={logout}
      />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-5 py-7 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function TopNav({
  user,
  items,
  pathname,
  onLogout,
  onOpenDrawer,
}: {
  user: { name: string; email: string; picture_url: string | null; role: string };
  items: NavItem[];
  pathname: string;
  onLogout: () => void;
  onOpenDrawer: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#272727] bg-[#121212]/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-5 sm:px-6">
        <BrandMark size="sm" />
        <nav className="hidden flex-1 items-center gap-1 lg:flex">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center rounded px-3 py-1.5 text-[13px] transition-colors ${
                  active
                    ? "text-white"
                    : "text-[#b3b3b3] hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <UserPill user={user} />
          <Button variant="ghost" size="sm" onClick={onLogout}>
            로그아웃
          </Button>
        </div>

        <button
          type="button"
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded bg-[#1f1f1f] text-white lg:hidden"
          onClick={onOpenDrawer}
          aria-label="메뉴 열기"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
      </div>
    </header>
  );
}

function UserPill({
  user,
}: {
  user: { name: string; picture_url: string | null; role: string };
}) {
  return (
    <Link
      href="/me"
      className="inline-flex items-center gap-2 rounded px-2 py-1 text-[13px] text-[#b3b3b3] transition-colors hover:text-white"
    >
      {user.picture_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.picture_url}
          alt=""
          className="h-6 w-6 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : null}
      <span className="max-w-[140px] truncate">{user.name}</span>
      {user.role === "admin" ? (
        <span className="text-[11px] text-[#1ed760]">관리자</span>
      ) : null}
    </Link>
  );
}

function MobileDrawer({
  open,
  onClose,
  items,
  pathname,
  userName,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  pathname: string;
  userName: string;
  onLogout: () => void;
}) {
  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/70 transition-opacity duration-200 lg:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[280px] flex-col border-l border-[#272727] bg-[#181818] transition-transform duration-200 lg:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-[#272727] px-5">
          <BrandMark size="sm" asLink={false} />
          <button
            type="button"
            onClick={onClose}
            aria-label="메뉴 닫기"
            className="inline-flex h-8 w-8 items-center justify-center rounded text-[#b3b3b3] hover:text-white"
          >
            ×
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={`rounded px-4 py-2.5 text-[14px] ${
                  active
                    ? "bg-[#1f1f1f] text-white"
                    : "text-[#b3b3b3]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[#272727] p-4">
          <p className="text-[12px] text-[#7c7c7c]">접속 중</p>
          <p className="mt-0.5 text-[14px] text-white">{userName}</p>
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            className="mt-3"
            onClick={onLogout}
          >
            로그아웃
          </Button>
        </div>
      </aside>
    </>
  );
}

function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#121212]">
      <div
        aria-hidden
        style={{ animation: "zh-spin 0.8s linear infinite" }}
        className="h-8 w-8 rounded-full border-[3px] border-[#272727] border-t-[#1ed760]"
      />
    </div>
  );
}

function PendingGate({
  userName,
  onLogout,
}: {
  userName: string;
  onLogout: () => void;
}) {
  return (
    <GateShell
      title="관리자 승인 대기중"
      description="승인 후에 기능을 이용할 수 있습니다."
      userName={userName}
      onLogout={onLogout}
    />
  );
}

function BannedGate({
  userName,
  onLogout,
}: {
  userName: string;
  onLogout: () => void;
}) {
  return (
    <GateShell
      title="접근이 차단된 계정입니다"
      description="문의 사항이 있다면 관리자에게 연락하세요."
      userName={userName}
      onLogout={onLogout}
    />
  );
}

function GateShell({
  title,
  description,
  userName,
  onLogout,
}: {
  title: string;
  description: string;
  userName: string;
  onLogout: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#121212] px-5 text-center">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-md border border-[#272727] bg-[#181818] p-6">
        <h1 className="text-[17px] font-semibold text-white">{title}</h1>
        <p className="text-[13px] text-[#b3b3b3]">{description}</p>
        <p className="text-[13px] text-[#b3b3b3]">{userName}</p>
        <Button variant="outline" size="sm" onClick={onLogout}>
          로그아웃
        </Button>
      </div>
    </div>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
