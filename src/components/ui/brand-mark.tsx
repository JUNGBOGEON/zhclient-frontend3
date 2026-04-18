import Link from "next/link";

export function BrandMark({
  size = "md",
  asLink = true,
}: {
  size?: "sm" | "md" | "lg";
  asLink?: boolean;
}) {
  const box =
    size === "lg" ? "h-10 w-10" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const title =
    size === "lg" ? "text-[20px]" : size === "sm" ? "text-[13px]" : "text-[16px]";
  const content = (
    <span className="inline-flex items-center gap-2.5 font-display">
      <span
        className={`${box} inline-flex items-center justify-center rounded-full bg-[#1ed760] text-black shadow-[0_6px_16px_rgba(30,215,96,0.35)]`}
      >
        <svg
          width="60%"
          height="60%"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M12 2 1.5 22h21L12 2Zm0 5.8 6.5 12H5.5L12 7.8Z" />
        </svg>
      </span>
      <span className={`${title} font-bold tracking-tight text-white`}>
        ZH Nexus
      </span>
    </span>
  );
  if (!asLink) return content;
  return (
    <Link href="/" className="inline-flex">
      {content}
    </Link>
  );
}
