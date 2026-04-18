import { forwardRef } from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  muted?: boolean;
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { interactive = false, muted = false, className = "", children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`rounded-xl border border-transparent p-5 transition-colors ${
        muted ? "bg-[#181818]" : "bg-[#181818]"
      } ${
        interactive
          ? "hover:bg-[#1f1f1f] hover:border-[#2a2a2a] cursor-pointer"
          : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
});

export function SectionCard({
  title,
  description,
  action,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-xl bg-[#181818] ${className}`}
    >
      {(title || description || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-[#272727] px-6 py-5">
          <div className="flex flex-col gap-1">
            {title ? (
              <h2 className="text-[18px] font-semibold leading-tight text-white">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="text-[13px] text-[#b3b3b3]">{description}</p>
            ) : null}
          </div>
          {action}
        </header>
      )}
      <div className={`p-6 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#2a2a2a] bg-[#121212] px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1f1f1f] text-[#b3b3b3]">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 21l-4.3-4.3" />
          <circle cx="11" cy="11" r="8" />
        </svg>
      </div>
      <p className="text-[16px] font-bold text-white">{title}</p>
      {description ? (
        <p className="max-w-md text-[13px] leading-relaxed text-[#b3b3b3]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-[#1f1f1f] ${className}`}
    >
      <div
        aria-hidden
        style={{ animation: "zh-pulse-dot 1.4s ease-in-out infinite" }}
        className="absolute inset-0 bg-[#2a2a2a]"
      />
    </div>
  );
}
