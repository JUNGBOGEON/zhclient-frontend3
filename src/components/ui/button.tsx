"use client";

import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
};

const BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const VARIANT: Record<Variant, string> = {
  primary: "bg-[#1ed760] text-black hover:bg-[#1fdf64]",
  secondary: "bg-[#2a2a2a] text-white hover:bg-[#323232]",
  ghost: "bg-transparent text-[#b3b3b3] hover:text-white",
  danger: "bg-[#f3727f] text-black hover:bg-[#ff8d98]",
  outline:
    "bg-transparent text-white border border-[#3a3a3a] hover:border-[#5a5a5a]",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-4 text-[13px]",
  lg: "h-10 px-5 text-[14px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      className = "",
      children,
      disabled,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${BASE} ${VARIANT[variant]} ${SIZE[size]} ${
          fullWidth ? "w-full" : ""
        } ${className}`}
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
