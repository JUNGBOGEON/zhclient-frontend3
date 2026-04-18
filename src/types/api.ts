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
  public_code: string;
  name: string;
  level: number;
  member_count: number;
  max_members?: number;
  owner_name?: string;
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
  role?: string;
  last_login_ms?: number | null;
}

export interface ClanDetail {
  public_code: string;
  name: string;
  level: number;
  owner_name?: string;
  member_count: number;
  max_members?: number;
  introduction?: string;
  comment?: string;
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
  id: string;
  name: string;
  region?: string;
  status: string;
  joinable: boolean;
  population?: number;
  capacity?: number;
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

export interface BadnameRequest {
  user_id: string;
  password: string;
  nickname: string;
  idempotency_key?: string;
}

export interface RenameRequest {
  user_id: string;
  password: string;
  nickname: string;
  slave_index?: number;
  idempotency_key?: string;
}

export interface CharacterRequest {
  user_id: string;
  password: string;
  nickname: string;
  idempotency_key?: string;
}

export interface SnipeRequest {
  user_id: string;
  password: string;
  nickname: string;
  slave_index?: number;
  rate_per_second?: number;
  idempotency_key?: string;
}

export interface CharacterEntry {
  slave_index: number;
  name: string;
  level: number;
}

export interface CharacterProbeResponse {
  slaves: CharacterEntry[];
}

export interface EligibilityRequest {
  user_id: string;
  password: string;
}

export interface StoredAccount {
  id: string;
  label: string;
  user_id: string;
  password: string;
  created_at: string;
}
