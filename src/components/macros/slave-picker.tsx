"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import type { CharacterEntry } from "@/types/api";

type SlavePickerProps = {
  userId: string;
  password: string;
  selectedSlaveIndex: number | null;
  onSelectedSlaveIndexChange: (index: number | null) => void;
};

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; slaves: CharacterEntry[] }
  | { kind: "error"; message: string };

/**
 * The parent must remount this component (via `key={userId|password}`) when
 * credentials change — that resets the probe state and prevents a stale slave
 * list from applying to a different account.
 */
export function SlavePicker({
  userId,
  password,
  selectedSlaveIndex,
  onSelectedSlaveIndexChange,
}: SlavePickerProps) {
  const [state, setState] = useState<State>({ kind: "idle" });

  const probe = useCallback(async () => {
    if (!userId.trim() || !password) {
      setState({
        kind: "error",
        message: "아이디와 비밀번호를 먼저 입력해 주세요.",
      });
      return;
    }
    setState({ kind: "loading" });
    try {
      const res = await api.probeCharacters({
        user_id: userId.trim(),
        password,
      });
      if (res.slaves.length === 0) {
        setState({ kind: "error", message: "캐릭터가 없습니다." });
        onSelectedSlaveIndexChange(null);
        return;
      }
      setState({ kind: "ready", slaves: res.slaves });
      onSelectedSlaveIndexChange(res.slaves[0].slave_index);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "캐릭터 조회 실패";
      setState({ kind: "error", message });
      onSelectedSlaveIndexChange(null);
    }
  }, [userId, password, onSelectedSlaveIndexChange]);

  if (state.kind === "ready" && state.slaves.length === 1) {
    const only = state.slaves[0];
    return (
      <div className="flex items-center justify-between rounded-md border border-[#272727] bg-[#181818] px-3 py-2">
        <div className="flex flex-col">
          <span className="text-[12px] text-[#7c7c7c]">캐릭터</span>
          <span className="text-[13px] text-white">
            {only.name}
            <span className="ml-2 text-[#7c7c7c]">
              Lv.{formatNumber(only.level)}
            </span>
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={probe}>
          새로 조회
        </Button>
      </div>
    );
  }

  if (state.kind === "ready") {
    return (
      <fieldset className="flex flex-col gap-2 rounded-md border border-[#272727] bg-[#181818] p-3">
        <legend className="px-1 text-[12px] text-[#b3b3b3]">
          캐릭터 선택
        </legend>
        <div className="flex flex-col gap-1">
          {state.slaves.map((slave) => {
            const active = slave.slave_index === selectedSlaveIndex;
            return (
              <label
                key={slave.slave_index}
                className={`flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-[13px] transition-colors ${
                  active
                    ? "bg-[#1f1f1f] text-white"
                    : "text-[#cbcbcb] hover:bg-[#1f1f1f]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="slave-index"
                    value={slave.slave_index}
                    checked={active}
                    onChange={() =>
                      onSelectedSlaveIndexChange(slave.slave_index)
                    }
                    className="accent-[#1ed760]"
                  />
                  <span>{slave.name}</span>
                </span>
                <span className="text-[#7c7c7c]">
                  Lv.{formatNumber(slave.level)}
                </span>
              </label>
            );
          })}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={probe}
          className="self-end"
        >
          새로 조회
        </Button>
      </fieldset>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[#272727] bg-[#181818] px-3 py-2">
      <span className="text-[12px] text-[#7c7c7c]">
        {state.kind === "error"
          ? state.message
          : state.kind === "loading"
            ? "조회 중…"
            : "캐릭터를 불러오면 대상 캐릭터를 선택합니다."}
      </span>
      <Button
        variant="secondary"
        size="sm"
        loading={state.kind === "loading"}
        onClick={probe}
      >
        캐릭터 불러오기
      </Button>
    </div>
  );
}
