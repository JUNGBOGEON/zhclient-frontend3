"use client";

import { forwardRef, useId } from "react";

type TextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helper?: string;
  errorText?: string;
  icon?: React.ReactNode;
  pill?: boolean;
};

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput(
    {
      label,
      helper,
      errorText,
      icon,
      pill = false,
      className = "",
      id,
      ...rest
    },
    ref,
  ) {
    const autoId = useId();
    const inputId = id || autoId;
    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label
            htmlFor={inputId}
            className="text-[12px] font-bold uppercase tracking-[1.6px] text-[#b3b3b3]"
          >
            {label}
          </label>
        ) : null}
        <div
          className={`relative flex items-center bg-[#1f1f1f] ${
            pill ? "rounded-full" : "rounded-md"
          } transition-all focus-within:bg-[#2a2a2a]`}
          style={{
            boxShadow:
              "rgb(18,18,18) 0px 1px 0px, rgb(124,124,124) 0px 0px 0px 1px inset",
          }}
        >
          {icon ? (
            <span className="pointer-events-none absolute left-4 flex h-full items-center text-[#b3b3b3]">
              {icon}
            </span>
          ) : null}
          <input
            ref={ref}
            id={inputId}
            className={`h-12 w-full bg-transparent py-3 text-[15px] font-medium text-white placeholder:text-[#7c7c7c] outline-none ${
              icon ? "pl-12 pr-5" : "px-5"
            } ${className}`}
            aria-invalid={errorText ? true : undefined}
            aria-describedby={errorText ? `${inputId}-error` : undefined}
            {...rest}
          />
        </div>
        {errorText ? (
          <p
            id={`${inputId}-error`}
            className="text-[12px] font-medium text-[#f3727f]"
          >
            {errorText}
          </p>
        ) : helper ? (
          <p className="text-[12px] text-[#b3b3b3]">{helper}</p>
        ) : null}
      </div>
    );
  },
);

type PasswordInputProps = Omit<TextInputProps, "type">;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(props, ref) {
    return <TextInput ref={ref} type="password" autoComplete="off" {...props} />;
  },
);

type SearchInputProps = Omit<TextInputProps, "pill" | "icon"> & {
  icon?: React.ReactNode;
};

export function SearchInput({ icon, ...rest }: SearchInputProps) {
  return (
    <TextInput
      pill
      icon={
        icon ?? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        )
      }
      {...rest}
    />
  );
}
