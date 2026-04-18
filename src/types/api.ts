export type UserStatus = "pending" | "approved" | "banned";
export type UserRole = "user" | "admin";

export interface User {
  id: number;
  email: string;
  name: string;
  picture_url: string | null;
  status: UserStatus;
  role: UserRole;
  created_at?: string | null;
  approved_at?: string | null;
  banned_at?: string | null;
}

export interface AuthGoogleResponse {
  access_token: string;
  token_type: string;
  expires_at: string;
  user: User;
}

export interface ClanSummary {
  clan_id: number;
  public_code: number;
  name: string;
  master_name: string;
  description: string;
  curr_players: number;
  max_players: number;
  game_money: number;
  owner_id: number;
  created_at_ms: number;
}

export interface ClanSearchResponse {
  query: string;
  total: number;
  clans: ClanSummary[];
}

export interface ClanMember {
  account_id: number;
  name: string;
  level: number;
}

export interface ClanDetail {
  clan_id: number;
  public_code: number;
  name: string;
  master_name: string;
  description: string;
  active_members: number;
  max_members: number;
  game_money: number;
  created_at_ms: number;
  members: ClanMember[];
}

export interface ClanRef {
  clan_id: number | null;
  name: string | null;
}

export interface PlayerProfile {
  account_id: number;
  name: string;
  level: number;
  clan: ClanRef;
  last_login_ms?: number | null;
  status_message?: string | null;
  chat_profile?: string | null;
  color_code?: string | null;
}

export interface PlayerWallet {
  slave_name: string;
  slave_level: number;
  mineral: number;
  gas: number;
}

export interface ServerEntry {
  server_id: string;
  name: string;
  ip: string;
  port: number;
  user_count: number;
  max_user_count: number;
  inspection: string;
  under_inspection: boolean;
  joinable: boolean;
  raw: Record<string, unknown>;
}

export interface ServerStatus {
  under_maintenance: boolean;
  joinable_count: number;
  inspection_messages: string[];
  servers: ServerEntry[];
}

export interface ModeEntry {
  id: string;
  name: string;
  blocked: boolean;
  inspected: boolean;
  note?: string;
}

export interface ModeStatus {
  total: number;
  blocked_count: number;
  inspected_count: number;
  modes: ModeEntry[];
}

export interface EligibilityCheck {
  name: string;
  passed: boolean;
  detail?: string | null;
}

export interface EligibilityResponse {
  eligible: boolean;
  checks: EligibilityCheck[];
  extra?: Record<string, unknown> | null;
}

export type MacroOpType =
  | "badname"
  | "rename"
  | "character"
  | "snipe"
  | "snipe_rename"
  | "snipe_character"
  | "snipe_badname";
export type MacroStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface JobResponse {
  id: string;
  user_id: number;
  op_type: MacroOpType;
  status: MacroStatus;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  error: string | null;
  attempts: number;
  max_attempts: number;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface HistoryResponse {
  jobs: JobResponse[];
  total: number;
  limit: number;
  offset: number;
}

interface _AccountJobBase {
  account_id?: string;
  user_id?: string;
  password?: string;
  idempotency_key?: string;
}

export interface BadnameRequest extends _AccountJobBase {
  nickname: string;
}

export interface RenameRequest extends _AccountJobBase {
  nickname: string;
  slave_index?: number;
}

export interface CharacterRequest extends _AccountJobBase {
  nickname: string;
}

export interface SnipeRequest extends _AccountJobBase {
  nickname: string;
  slave_index?: number;
  rate_per_second?: number;
}

export interface CharacterEntry {
  slave_index: number;
  name: string;
  level: number;
}

export interface CharacterProbeResponse {
  slaves: CharacterEntry[];
}

export type AccountKind = "integrated" | "non_integrated";

export interface AccountCheckEntry {
  name: string;
  passed: boolean;
  detail: string;
}

export interface AccountCheckResponse {
  ok: boolean;
  checks: AccountCheckEntry[];
  slaves: CharacterEntry[];
}

export interface EligibilityRequest {
  user_id: string;
  password: string;
}

export interface StoredAccount {
  id: string;
  label: string;
  game_user_id: string;
  kind: AccountKind;
  selected_slave_index?: number | null;
  last_checked_at?: string | null;
  last_check?: AccountCheckResponse | null;
  created_at: string;
  updated_at?: string;
}

export interface CreateAccountPayload {
  label: string;
  game_user_id: string;
  password: string;
  kind: AccountKind;
}

export interface UpdateAccountPayload {
  label?: string;
  password?: string;
  kind?: AccountKind;
  selected_slave_index?: number | null;
}
