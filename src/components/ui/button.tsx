"use client";

import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  uppercase?: boolean;
};

const BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-[#1ed760] text-black hover:bg-[#1fdf64] hover:scale-[1.03] disabled:hover:scale-100",
  secondary:
    "bg-[#1f1f1f] text-white hover:bg-[#2a2a2a] hover:text-white",
  ghost:
    "bg-transparent text-[#b3b3b3] hover:bg-[#1f1f1f] hover:text-white",
  danger: "bg-[#f3727f] text-black hover:bg-[#ff8d98]",
  outline:
    "bg-transparent text-white border border-[#7c7c7c] hover:border-white hover:bg-white/[0.04]",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-4 text-[12px] tracking-[0.14px]",
  md: "h-10 px-5 text-[14px] tracking-[0.14px]",
  lg: "h-12 px-8 text-[14px] tracking-[0.14px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      uppercase = false,
      className = "",
      children,
      disabled,
      ...rest
    },
    ref,
  ) {
    const textStyle = uppercase
      ? "uppercase tracking-[1.6px]"
      : "";
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${BASE} ${VARIANT[variant]} ${SIZE[size]} ${
          fullWidth ? "w-full" : ""
        } ${textStyle} ${className}`}
        {...rest}
      >
        {loading ? <Spinner /> : null}
        {children}
      </button>
    );
  },
);

function Spinner() {
  return (
    <span
      aria-hidden
      style={{ animation: "zh-spin 0.75s linear infinite" }}
      className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent opacity-80"
    />
  );
}

export type { ButtonProps };
