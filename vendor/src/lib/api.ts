const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_KEY_STORAGE_KEY = "shadowpay-vendor:api-key";

export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function setApiKey(key: string) {
  window.localStorage.setItem(API_KEY_STORAGE_KEY, key);
}

export function clearApiKey() {
  window.localStorage.removeItem(API_KEY_STORAGE_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, body: unknown) {
    super(typeof body === "object" && body && "detail" in body ? String((body as { detail: unknown }).detail) : `API error ${status}`);
    this.status = status;
  }
}

async function request<T>(path: string, apiKeyOverride?: string): Promise<T> {
  const key = apiKeyOverride ?? getApiKey();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key) headers["Authorization"] = `ApiKey ${key}`;

  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // no JSON body
    }
    throw new ApiError(res.status, body);
  }
  return res.json() as Promise<T>;
}

// ---- Types (mirrors backend/merchants + agreements serializers) ----

export interface VendorProfile {
  id: string;
  name: string;
  contact_email: string;
  verified: boolean;
  created_at: string;
}

export interface RosterMerchant {
  id: string;
  name: string;
  verified: boolean;
  created_at: string;
}

export interface VendorStats {
  merchant_count: number;
  agreement_count: number;
  total_volume: number;
  on_time_rate: number | null;
}

export interface PayoutRow {
  merchant_id: string;
  merchant_name: string;
  verified: boolean;
  agreement_count: number;
  total_volume: number;
}

export function getVendorProfile(apiKey?: string) {
  return request<VendorProfile>("/api/merchants/vendor/me/", apiKey);
}

export function getVendorRoster() {
  return request<RosterMerchant[]>("/api/merchants/vendor/roster/");
}

export function getVendorStats() {
  return request<VendorStats>("/api/agreements/vendor/stats/");
}

export function getVendorPayouts() {
  return request<PayoutRow[]>("/api/agreements/vendor/payouts/");
}
