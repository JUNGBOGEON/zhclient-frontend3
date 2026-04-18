"use client";

import { useEffect, useId, useRef, useState } from "react";

type Option = { value: string | number; label: string; hint?: string };

type SelectProps = {
  label?: string;
  value: string | number;
  options: Option[];
  onChange: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = "선택",
  disabled = false,
  className = "",
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const handle = (ev: MouseEvent) => {
      if (ref.current && !ref.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div className={`flex flex-col gap-1 ${className}`} ref={ref}>
      {label ? (
        <label htmlFor={id} className="text-[13px] text-[#b3b3b3]">
          {label}
        </label>
      ) : null}
      <button
        type="button"
        id={id}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-11 items-center justify-between rounded-full bg-[#1f1f1f] px-4 text-[14px] text-white shadow-[0px_1px_0px_#121212,inset_0px_0px_0px_1px_#7c7c7c] transition-all hover:shadow-[inset_0px_0px_0px_1px_#ffffff] focus:shadow-[inset_0px_0px_0px_1px_#ffffff] disabled:opacity-50"
      >
        <span className={selected ? "text-white" : "text-[#7c7c7c]"}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`text-[#b3b3b3] transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open ? (
        <div role="listbox" className="relative">
          <ul className="absolute left-0 right-0 top-2 z-40 max-h-64 overflow-y-auto rounded-[8px] bg-[#252525] p-1 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">

            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <li
                  key={String(opt.value)}
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`flex cursor-pointer items-center justify-between rounded px-3 py-2 text-[13px] transition-colors ${
                    active
                      ? "bg-[#333333] text-white"
                      : "text-[#cbcbcb] hover:bg-[#2a2a2a] hover:text-white"
                  }`}
                >
                  <span>{opt.label}</span>
                  {opt.hint ? (
                    <span className="text-[11px] text-[#7c7c7c]">
                      {opt.hint}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
