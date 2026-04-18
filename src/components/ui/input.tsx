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
      <div className="flex flex-col gap-1">
        {label ? (
          <label htmlFor={inputId} className="text-[13px] text-[#b3b3b3]">
            {label}
          </label>
        ) : null}
        <div
          className={`relative flex items-center border border-[#3a3a3a] bg-[#1f1f1f] ${
            pill ? "rounded-full" : "rounded-md"
          } focus-within:border-[#5a5a5a]`}
        >
          {icon ? (
            <span className="pointer-events-none absolute left-3 flex h-full items-center text-[#7c7c7c]">
              {icon}
            </span>
          ) : null}
          <input
            ref={ref}
            id={inputId}
            className={`h-9 w-full bg-transparent text-[14px] text-white placeholder:text-[#7c7c7c] outline-none ${
              icon ? "pl-10 pr-3" : "px-3"
            } ${className}`}
            aria-invalid={errorText ? true : undefined}
            aria-describedby={errorText ? `${inputId}-error` : undefined}
            {...rest}
          />
        </div>
        {errorText ? (
          <p id={`${inputId}-error`} className="text-[12px] text-[#f3727f]">
            {errorText}
          </p>
        ) : helper ? (
          <p className="text-[12px] text-[#7c7c7c]">{helper}</p>
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
      icon={
        icon ?? (
          <svg
            width="16"
            height="16"
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
