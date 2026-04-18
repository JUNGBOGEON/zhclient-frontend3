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
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold uppercase tracking-[1.4px] transition-all disabled:cursor-not-allowed disabled:opacity-50";

const VARIANT: Record<Variant, string> = {
  primary: "bg-[#1ed760] text-black hover:scale-104 active:scale-100",
  secondary: "bg-[#1f1f1f] text-white hover:bg-[#2a2a2a] hover:scale-104 active:scale-100",
  ghost: "bg-transparent text-[#b3b3b3] hover:text-white hover:scale-104 active:scale-100",
  danger: "bg-[#f3727f] text-black hover:bg-[#ff8d98] hover:scale-104 active:scale-100",
  outline:
    "bg-transparent text-white border border-[#7c7c7c] hover:border-[#ffffff] hover:scale-104 active:scale-100",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-4 text-[12px]",
  md: "h-10 px-8 text-[14px]",
  lg: "h-12 px-10 text-[14px]",
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
