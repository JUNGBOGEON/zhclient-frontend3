"use client";

import { PasswordInput, TextInput } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { StoredAccount } from "@/types/api";

type CredentialFieldsProps = {
  accounts: StoredAccount[];
  selectedId: string;
  onSelectedIdChange: (id: string) => void;
  userId: string;
  password: string;
  onUserIdChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  slaveIndex?: number;
  onSlaveIndexChange?: (value: number) => void;
  showSlaveIndex?: boolean;
};

const MANUAL = "__manual__";

export function CredentialFields({
  accounts,
  selectedId,
  onSelectedIdChange,
  userId,
  password,
  onUserIdChange,
  onPasswordChange,
  slaveIndex,
  onSlaveIndexChange,
  showSlaveIndex = false,
}: CredentialFieldsProps) {
  const accountOptions = [
    { value: MANUAL, label: "직접 입력" },
    ...accounts.map((a) => ({
      value: a.id,
      label: a.label,
      hint: a.user_id,
    })),
  ];

  const handleSelectChange = (value: string | number) => {
    const id = String(value);
    onSelectedIdChange(id);
    if (id === MANUAL) {
      return;
    }
    const acct = accounts.find((a) => a.id === id);
    if (!acct) return;
    onUserIdChange(acct.user_id);
    onPasswordChange(acct.password);
    if (onSlaveIndexChange) onSlaveIndexChange(acct.slave_index);
  };

  const manual = selectedId === MANUAL || !selectedId;

  return (
    <div className="flex flex-col gap-4">
      <Select
        label="계정"
        value={selectedId || MANUAL}
        onChange={handleSelectChange}
        options={accountOptions}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput
          label="User ID"
          placeholder="user_id"
          value={userId}
          onChange={(e) => onUserIdChange(e.target.value)}
          autoComplete="off"
          disabled={!manual}
        />
        <PasswordInput
          label="Password"
          placeholder="********"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          disabled={!manual}
        />
      </div>
      {showSlaveIndex && onSlaveIndexChange ? (
        <Select
          label="부캐 슬롯"
          value={slaveIndex ?? 0}
          onChange={(v) => onSlaveIndexChange(Number(v))}
          options={[0, 1, 2, 3].map((n) => ({
            value: n,
            label: `슬롯 ${n}`,
          }))}
        />
      ) : null}
    </div>
  );
}

export const CREDENTIAL_MANUAL = MANUAL;
