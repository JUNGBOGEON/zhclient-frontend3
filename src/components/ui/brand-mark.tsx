import Link from "next/link";

export function BrandMark({
  size = "md",
  asLink = true,
}: {
  size?: "sm" | "md" | "lg";
  asLink?: boolean;
}) {
  const box =
    size === "lg" ? "h-8 w-8" : size === "sm" ? "h-6 w-6" : "h-7 w-7";
  const title =
    size === "lg" ? "text-[17px]" : size === "sm" ? "text-[13px]" : "text-[15px]";
  const content = (
    <span className="inline-flex items-center gap-2">
      <span
        className={`${box} inline-flex items-center justify-center rounded bg-[#1ed760] text-black`}
      >
        <svg
          width="62%"
          height="62%"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M12 2 1.5 22h21L12 2Zm0 5.8 6.5 12H5.5L12 7.8Z" />
        </svg>
      </span>
      <span className={`${title} font-semibold tracking-tight text-white`}>
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
