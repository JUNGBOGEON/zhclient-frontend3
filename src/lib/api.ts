import type {
  AccountCheckResponse,
  AccountKind,
  AuthGoogleResponse,
  BadnameRequest,
  CharacterProbeResponse,
  CharacterRequest,
  ClanDetail,
  ClanSearchResponse,
  CreateAccountPayload,
  EligibilityRequest,
  EligibilityResponse,
  HistoryResponse,
  JobResponse,
  MacroStatus,
  ModeStatus,
  PlayerProfile,
  PlayerWallet,
  RenameRequest,
  ServerStatus,
  SnipeRequest,
  StoredAccount,
  UpdateAccountPayload,
  User,
  UserStatus,
} from "@/types/api";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const TOKEN_STORAGE_KEY = "zh_token";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(TOKEN_STORAGE_KEY)
      : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });
  } catch (err) {
    throw new ApiError(
      0,
      err instanceof Error ? err.message : "네트워크 오류",
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let body: unknown = undefined;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const detail =
      body && typeof body === "object" && "detail" in body
        ? (body as { detail: unknown }).detail
        : text || res.statusText;
    const message =
      typeof detail === "string"
        ? detail
        : detail && typeof detail === "object" && "message" in detail
          ? String((detail as { message: unknown }).message)
          : res.statusText;
    throw new ApiError(res.status, message, detail);
  }

  return body as T;
}

export const api = {
  exchangeGoogleToken: (id_token: string) =>
    request<AuthGoogleResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ id_token }),
    }),
  getMe: () => request<User>("/me"),

  adminListUsers: (status?: UserStatus) => {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    return request<User[]>(`/admin/users${q}`);
  },
  adminApproveUser: (id: number) =>
    request<User>(`/admin/users/${id}/approve`, { method: "POST" }),
  adminBanUser: (id: number) =>
    request<User>(`/admin/users/${id}/ban`, { method: "POST" }),

  getPlayer: (name: string) =>
    request<PlayerProfile>(`/players/${encodeURIComponent(name)}`),
  getMyWallet: () => request<PlayerWallet>("/players/me/wallet"),
  probeCharacters: (body: { user_id: string; password: string }) =>
    request<CharacterProbeResponse>("/players/characters/probe", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  checkAccount: (body: {
    user_id: string;
    password: string;
    kind: AccountKind;
  }) =>
    request<AccountCheckResponse>("/players/account/check", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  searchClans: (name: string) =>
    request<ClanSearchResponse>(
      `/clans/search?name=${encodeURIComponent(name)}`,
    ),
  getClan: (publicCode: number | string) =>
    request<ClanDetail>(`/clans/${encodeURIComponent(String(publicCode))}`),
  findClanByName: (name: string) =>
    request<ClanDetail>(`/clans/find/${encodeURIComponent(name)}`),

  getServerStatus: () => request<ServerStatus>("/servers/status"),
  getModeStatus: () => request<ModeStatus>("/modes/status"),

  eligibilityBadname: (body: EligibilityRequest) =>
    request<EligibilityResponse>("/eligibility/badname", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  eligibilityCharacter: (body: EligibilityRequest) =>
    request<EligibilityResponse>("/eligibility/character", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  eligibilityRename: (body: EligibilityRequest) =>
    request<EligibilityResponse>("/eligibility/rename", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  macroBadname: (body: BadnameRequest) =>
    request<JobResponse>("/macros/badname", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  macroRename: (body: RenameRequest) =>
    request<JobResponse>("/macros/rename", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  macroCharacter: (body: CharacterRequest) =>
    request<JobResponse>("/macros/character", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  macroSnipeRename: (body: SnipeRequest) =>
    request<JobResponse>("/macros/snipe-rename", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  macroSnipeCharacter: (body: Omit<SnipeRequest, "slave_index">) =>
    request<JobResponse>("/macros/snipe-character", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  macroSnipeBadname: (body: Omit<SnipeRequest, "slave_index">) =>
    request<JobResponse>("/macros/snipe-badname", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listMyMacros: () => request<JobResponse[]>("/macros"),
  getMacro: (id: string) =>
    request<JobResponse>(`/macros/${encodeURIComponent(id)}`),
  cancelMacro: (id: string) =>
    request<JobResponse>(`/macros/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
    }),
  listMacroHistory: (opts: {
    status?: MacroStatus[];
    nickname?: string;
    limit?: number;
    offset?: number;
  } = {}) => {
    const q = new URLSearchParams();
    (opts.status ?? []).forEach((s) => q.append("status", s));
    if (opts.nickname) q.set("nickname", opts.nickname);
    q.set("limit", String(opts.limit ?? 20));
    q.set("offset", String(opts.offset ?? 0));
    return request<HistoryResponse>(`/macros/history?${q.toString()}`);
  },
  deleteMacro: (id: string) =>
    request<void>(`/macros/${encodeURIComponent(id)}`, { method: "DELETE" }),
  deleteMacroHistory: (status?: MacroStatus[]) => {
    const q = new URLSearchParams();
    (status ?? []).forEach((s) => q.append("status", s));
    const qs = q.toString();
    return request<{ removed: number }>(
      qs ? `/macros/history?${qs}` : "/macros/history",
      { method: "DELETE" },
    );
  },
  adminListMacros: (status?: MacroStatus) => {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    return request<JobResponse[]>(`/admin/macros${q}`);
  },

  listMyAccounts: () => request<StoredAccount[]>("/me/accounts"),
  createMyAccount: (body: CreateAccountPayload) =>
    request<StoredAccount>("/me/accounts", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateMyAccount: (id: string, body: UpdateAccountPayload) =>
    request<StoredAccount>(`/me/accounts/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteMyAccount: (id: string) =>
    request<void>(`/me/accounts/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  runMyAccountCheck: (id: string) =>
    request<AccountCheckResponse>(
      `/me/accounts/${encodeURIComponent(id)}/check`,
      { method: "POST" },
    ),
  rerollMyAccountDevice: (id: string) =>
    request<StoredAccount>(
      `/me/accounts/${encodeURIComponent(id)}/reroll-device`,
      { method: "POST" },
    ),
};

export const API_BASE_URL = BASE_URL;

export default api;
