"use client";

import { Select } from "@/components/ui/select";

type SnipeControlsProps = {
  rate: number;
  onRateChange: (next: number) => void;
  duration: number;
  onDurationChange: (next: number) => void;
};

const DURATIONS = [
  { value: 15 * 60, label: "15분" },
  { value: 30 * 60, label: "30분" },
  { value: 60 * 60, label: "1시간" },
  { value: 3 * 60 * 60, label: "3시간" },
  { value: 12 * 60 * 60, label: "12시간" },
];

export function SnipeControls({
  rate,
  onRateChange,
  duration,
  onDurationChange,
}: SnipeControlsProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-[1fr_220px] sm:items-end">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="snipe-rate"
            className="text-[12px] font-bold uppercase tracking-[1.6px] text-[#b3b3b3]"
          >
            초당 시도 수
          </label>
          <span className="rounded-full bg-[#1f1f1f] px-3 py-1 text-[12px] font-bold text-[#1ed760]">
            {rate.toFixed(1)} req/s
          </span>
        </div>
        <input
          id="snipe-rate"
          type="range"
          min={0.5}
          max={50}
          step={0.5}
          value={rate}
          onChange={(e) => onRateChange(Number(e.target.value))}
          aria-label="초당 시도 수"
        />
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-[1.2px] text-[#7c7c7c]">
          <span>0.5</span>
          <span>25</span>
          <span>50</span>
        </div>
      </div>
      <Select
        label="최대 실행 시간"
        value={duration}
        onChange={(v) => onDurationChange(Number(v))}
        options={DURATIONS}
      />
    </div>
  );
}
