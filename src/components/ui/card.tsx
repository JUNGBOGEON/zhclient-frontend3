import { forwardRef } from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  muted?: boolean;
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { interactive = false, className = "", children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`rounded-[8px] bg-[#181818] p-4 transition-all ${
        interactive ? "hover:bg-[#272727] hover:shadow-[0_8px_8px_rgba(0,0,0,0.3)] cursor-pointer" : ""
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
      className={`overflow-hidden rounded-[8px] bg-[#181818] ${className}`}
    >
      {(title || description || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-[#272727] px-5 py-3">
          <div className="flex flex-col gap-0.5">
            {title ? (
              <h2 className="text-[15px] font-semibold leading-tight text-white">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="text-[12px] text-[#7c7c7c]">{description}</p>
            ) : null}
          </div>
          {action}
        </header>
      )}
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
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
    <div className="flex flex-col items-center gap-2 rounded-[8px] bg-[#1f1f1f] px-6 py-10 text-center">
      <p className="text-[14px] text-white">{title}</p>
      {description ? (
        <p className="max-w-md text-[13px] text-[#7c7c7c]">{description}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
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
      className={`relative overflow-hidden rounded bg-[#1f1f1f] ${className}`}
    >
      <div
        aria-hidden
        style={{ animation: "zh-pulse-dot 1.4s ease-in-out infinite" }}
        className="absolute inset-0 bg-[#2a2a2a]"
      />
    </div>
  );
}
