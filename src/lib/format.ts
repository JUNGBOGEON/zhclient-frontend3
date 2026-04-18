export function formatNumber(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return n.toLocaleString("ko-KR");
}

export function formatLastLogin(
  ms: number | undefined | null,
): { label: string; tone: "online" | "recent" | "old" | "unknown" } {
  if (!ms) return { label: "기록 없음", tone: "unknown" };
  const now = Date.now();
  const diff = Math.max(0, now - ms);
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return { label: "현재 접속중", tone: "online" };

  const min = Math.floor(sec / 60);
  if (min < 1) return { label: `${sec}초 전`, tone: "recent" };
  if (min < 60) return { label: `${min}분 전`, tone: "recent" };

  const hour = Math.floor(min / 60);
  if (hour < 24) return { label: `${hour}시간 전`, tone: "recent" };

  const day = Math.floor(hour / 24);
  if (day < 30) return { label: `${day}일 전`, tone: "old" };

  const month = Math.floor(day / 30);
  if (month < 12) return { label: `${month}개월 전`, tone: "old" };

  const year = Math.floor(month / 12);
  return { label: `${year}년 전`, tone: "old" };
}

export function formatAbsolute(ms: number | undefined | null): string {
  if (!ms) return "";
  try {
    return new Date(ms).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

export function formatRelativeFromISO(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  return formatLastLogin(t).label;
}

export function formatElapsed(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
