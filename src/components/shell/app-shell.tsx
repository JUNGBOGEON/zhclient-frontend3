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
  icon: React.ReactNode;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  {
    href: "/",
    label: "유저 검색",
    icon: (
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
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    ),
  },
  {
    href: "/clans",
    label: "클랜",
    icon: (
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
        <path d="M4 4h6l2 3h8v13H4z" />
      </svg>
    ),
  },
  {
    href: "/macros",
    label: "매크로",
    icon: (
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
        <path d="M5 12h14" />
        <path d="M12 5v14" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
  },
  {
    href: "/servers",
    label: "서버 상태",
    icon: (
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
        <rect x="3" y="4" width="18" height="7" rx="2" />
        <rect x="3" y="13" width="18" height="7" rx="2" />
        <circle cx="7" cy="7.5" r="0.8" fill="currentColor" />
        <circle cx="7" cy="16.5" r="0.8" fill="currentColor" />
      </svg>
    ),
  },
];

const ADMIN_NAV: NavItem[] = [
  {
    href: "/admin/users",
    label: "관리자",
    adminOnly: true,
    icon: (
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
        <path d="M12 2 3 6v6c0 5 4 9 9 10 5-1 9-5 9-10V6l-9-4Z" />
      </svg>
    ),
  },
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

  if (status === "loading") {
    return <FullPageSpinner />;
  }

  if (status === "unauthenticated" || !user) {
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
        <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
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
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-6 px-5 sm:px-8">
        <BrandMark />
        <nav className="hidden flex-1 items-center gap-1 lg:flex">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-bold transition-colors ${
                  active
                    ? "bg-[#1f1f1f] text-white"
                    : "text-[#b3b3b3] hover:text-white"
                }`}
              >
                <span
                  className={
                    active ? "text-[#1ed760]" : "text-[#7c7c7c] group-hover:text-white"
                  }
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden items-center gap-3 lg:flex">
          <UserPill user={user} />
          <Button
            variant="ghost"
            size="sm"
            uppercase
            onClick={onLogout}
          >
            로그아웃
          </Button>
        </div>

        <button
          type="button"
          className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1f1f1f] text-white transition-colors hover:bg-[#2a2a2a] lg:hidden"
          onClick={onOpenDrawer}
          aria-label="메뉴 열기"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
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
      className="inline-flex items-center gap-2 rounded-full bg-[#1f1f1f] py-1.5 pl-1.5 pr-4 text-[13px] font-bold text-white transition-colors hover:bg-[#2a2a2a]"
    >
      <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[#121212] text-[12px] font-bold text-[#1ed760]">
        {user.picture_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.picture_url}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          (user.name || "?").slice(0, 1).toUpperCase()
        )}
      </span>
      <span className="max-w-[120px] truncate">{user.name}</span>
      {user.role === "admin" ? (
        <span className="rounded-full bg-[#1ed760] px-2 py-[2px] text-[10px] font-bold uppercase tracking-[1px] text-black">
          관리자
        </span>
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
        className={`fixed inset-y-0 right-0 z-50 flex w-[300px] flex-col border-l border-[#272727] bg-[#181818] transition-transform duration-200 lg:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-[#272727] px-6">
          <BrandMark size="sm" asLink={false} />
          <button
            type="button"
            onClick={onClose}
            aria-label="메뉴 닫기"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1f1f1f] text-white"
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
                className={`flex items-center gap-3 rounded-full px-5 py-3 text-[14px] font-bold ${
                  active
                    ? "bg-[#1f1f1f] text-white"
                    : "text-[#b3b3b3] hover:text-white"
                }`}
              >
                <span
                  className={
                    active ? "text-[#1ed760]" : "text-[#7c7c7c]"
                  }
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[#272727] p-5">
          <p className="text-[12px] uppercase tracking-[1.4px] text-[#7c7c7c]">
            접속 중
          </p>
          <p className="mt-1 text-[14px] font-bold text-white">{userName}</p>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" size="sm" fullWidth onClick={onLogout}>
              로그아웃
            </Button>
          </div>
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
        className="h-9 w-9 rounded-full border-[3px] border-[#272727] border-t-[#1ed760]"
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
      description="접근 권한 승인 후 모든 기능을 이용할 수 있습니다."
      userName={userName}
      onLogout={onLogout}
      tone="warning"
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
      description="문의 사항이 있다면 관리자에게 연락해주세요."
      userName={userName}
      onLogout={onLogout}
      tone="danger"
    />
  );
}

function GateShell({
  title,
  description,
  userName,
  onLogout,
  tone,
}: {
  title: string;
  description: string;
  userName: string;
  onLogout: () => void;
  tone: "warning" | "danger";
}) {
  const accent =
    tone === "warning" ? "text-[#ffa42b]" : "text-[#f3727f]";
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#121212] px-5 text-center">
      <div
        className="flex w-full max-w-md flex-col items-center gap-5 rounded-2xl bg-[#181818] p-10"
        style={{ boxShadow: "var(--shadow-heavy)" }}
      >
        <span className={`text-[12px] font-bold uppercase tracking-[2px] ${accent}`}>
          {tone === "warning" ? "PENDING" : "BANNED"}
        </span>
        <h1 className="text-[24px] font-bold tracking-tight text-white">
          {title}
        </h1>
        <p className="text-[14px] leading-relaxed text-[#b3b3b3]">
          {description}
        </p>
        <div className="rounded-full bg-[#1f1f1f] px-4 py-2 text-[13px] font-semibold text-white">
          {userName}
        </div>
        <Button variant="outline" size="md" uppercase onClick={onLogout}>
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
