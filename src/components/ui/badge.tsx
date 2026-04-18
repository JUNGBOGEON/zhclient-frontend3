type BadgeTone =
  | "neutral"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "mute";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-[#1f1f1f] text-white",
  success: "bg-[#1ed760]/15 text-[#1ed760]",
  danger: "bg-[#f3727f]/15 text-[#f3727f]",
  warning: "bg-[#ffa42b]/15 text-[#ffa42b]",
  info: "bg-[#539df5]/15 text-[#539df5]",
  mute: "bg-[#181818] text-[#b3b3b3]",
};

export function Badge({
  tone = "neutral",
  children,
  uppercase = false,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  uppercase?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ${
        uppercase ? "uppercase tracking-[1.2px]" : ""
      } ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function StatusDot({
  tone = "neutral",
  pulse = false,
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
      style={
        pulse
          ? { animation: "zh-pulse-dot 1.6s ease-in-out infinite" }
          : undefined
      }
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${color}`}
    />
  );
}
