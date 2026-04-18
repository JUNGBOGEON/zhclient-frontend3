type BadgeTone =
  | "neutral"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "mute";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-[#2a2a2a] text-[#e5e5e5]",
  success: "bg-[#1ed760]/15 text-[#1ed760]",
  danger: "bg-[#f3727f]/15 text-[#f3727f]",
  warning: "bg-[#ffa42b]/15 text-[#ffa42b]",
  info: "bg-[#539df5]/15 text-[#539df5]",
  mute: "bg-[#1f1f1f] text-[#b3b3b3]",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium leading-[1.4] ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function StatusDot({
  tone = "neutral",
}: {
  tone?: "success" | "danger" | "warning" | "info" | "neutral";
  pulse?: boolean;
}) {
  const color =
    tone === "success"
      ? "bg-[#1ed760]"
      : tone === "danger"
        ? "bg-[#f3727f]"
        : tone === "warning"
          ? "bg-[#ffa42b]"
          : tone === "info"
            ? "bg-[#539df5]"
            : "bg-[#7c7c7c]";
  return (
    <span
      aria-hidden
      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${color}`}
    />
  );
}
