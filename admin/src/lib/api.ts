const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const ACCESS_TOKEN_KEY = "shadowpay-admin:access";
const REFRESH_TOKEN_KEY = "shadowpay-admin:refresh";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(access: string, refresh: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, access);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, body: unknown) {
    super(typeof body === "object" && body && "detail" in body ? String((body as { detail: unknown }).detail) : `API error ${status}`);
    this.status = status;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  const res = await fetch(`${API_URL}/api/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) {
    clearTokens();
    return null;
  }
  const data = await res.json();
  window.localStorage.setItem(ACCESS_TOKEN_KEY, data.access);
  return data.access as string;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const doFetch = () =>
    fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await doFetch();
  if (res.status === 401 && auth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await doFetch();
    }
  }

  if (!res.ok) {
    let body_: unknown = null;
    try {
      body_ = await res.json();
    } catch {
      // no JSON body
    }
    throw new ApiError(res.status, body_);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ---- Auth ----

export interface Challenge {
  challenge_id: string;
  message: string;
  expires_at: string;
}

export function authChallenge(walletAddress: string) {
  return request<Challenge>("/api/auth/challenge/", { method: "POST", auth: false, body: { wallet_address: walletAddress } });
}

export interface AuthResult {
  access: string;
  refresh: string;
  user: { id: string; wallet_address: string; role: string; date_joined: string };
}

export function authVerify(challengeId: string, walletAddress: string, signature: string) {
  return request<AuthResult>("/api/auth/verify/", {
    method: "POST",
    auth: false,
    body: { challenge_id: challengeId, wallet_address: walletAddress, signature },
  });
}

export function getMe() {
  return request<AuthResult["user"]>("/api/auth/me/");
}

// ---- Onboarding ----

export interface AdminMerchant {
  id: string;
  name: string;
  contact_email: string;
  vendor: string | null;
  verified: boolean;
  onchain_registered_at: string | null;
  created_at: string;
}

export interface AdminVendor {
  id: string;
  name: string;
  contact_email: string;
  verified: boolean;
  created_at: string;
}

export function listMerchants(pendingOnly = false) {
  return request<AdminMerchant[]>(`/api/admin/onboarding/merchants/${pendingOnly ? "?pending=true" : ""}`);
}

export function createMerchant(params: { name: string; contact_email: string; vendor_id?: string }) {
  return request<AdminMerchant & { api_key: string }>("/api/admin/onboarding/merchants/", {
    method: "POST",
    body: params,
  });
}

export function approveMerchant(id: string) {
  return request<AdminMerchant>(`/api/admin/onboarding/merchants/${id}/approve/`, { method: "POST" });
}

export function rejectMerchant(id: string) {
  return request<AdminMerchant>(`/api/admin/onboarding/merchants/${id}/reject/`, { method: "POST" });
}

export function listVendors() {
  return request<AdminVendor[]>("/api/admin/onboarding/vendors/");
}

export function createVendor(params: { name: string; contact_email: string }) {
  return request<AdminVendor & { api_key: string }>("/api/admin/onboarding/vendors/", {
    method: "POST",
    body: params,
  });
}

export function approveVendor(id: string) {
  return request<AdminVendor>(`/api/admin/onboarding/vendors/${id}/approve/`, { method: "POST" });
}

// ---- Pool / disputes / risk config ----

export interface PoolMonitoring {
  total_agreements: number;
  active_agreements: number;
  completed_agreements: number;
  total_volume_disbursed: number;
  aggregate_on_time_rate: number | null;
  disputed_agreements: number;
}

export function getPoolMonitoring() {
  return request<PoolMonitoring>("/api/admin/pool/");
}

export interface DisputeRow {
  id: string;
  status: string;
  onchain_agreement_id: string;
  created_at: string;
  confirmed_at: string | null;
}

export function getDisputeQueue() {
  return request<DisputeRow[]>("/api/admin/disputes/");
}

export interface RiskConfig {
  threshold: number;
  updated_at: string;
}

export function getRiskConfig() {
  return request<RiskConfig>("/api/admin/risk-config/");
}

export function updateRiskConfig(threshold: number) {
  return request<RiskConfig>("/api/admin/risk-config/", { method: "PATCH", body: { threshold } });
}
