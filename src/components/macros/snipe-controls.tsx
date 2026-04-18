"use client";

type SnipeControlsProps = {
  rate: number;
  onRateChange: (next: number) => void;
};

export function SnipeControls({ rate, onRateChange }: SnipeControlsProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor="snipe-rate" className="text-[13px] text-[#b3b3b3]">
          초당 시도 수
        </label>
        <span className="text-[13px] text-[#1ed760]">
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
      <div className="flex justify-between text-[11px] text-[#7c7c7c]">
        <span>0.5</span>
        <span>25</span>
        <span>50</span>
      </div>
      <p className="text-[12px] text-[#7c7c7c]">
        닉네임이 먹힐 때까지 계속 시도합니다. 중단하려면 작업을 취소하세요.
      </p>
    </div>
  );
}
