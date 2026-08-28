const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_KEY_STORAGE_KEY = "shadowpay-merchant:api-key";

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

// ---- Types (mirrors backend/agreements/serializers.py + merchants) ----

export interface MerchantProfile {
  id: string;
  name: string;
  contact_email: string;
  onchain_merchant_id: string;
  verified: boolean;
  vendor: string | null;
  created_at: string;
}

export interface Installment {
  amount: number;
  due_date: string;
}

export interface Payment {
  id: string;
  installment_index: number;
  due_date: string;
  paid_at: string | null;
  on_time: boolean | null;
}

export interface AgreementDetail {
  id: string;
  status: "pending" | "active" | "completed";
  onchain_agreement_id: string;
  created_at: string;
  confirmed_at: string | null;
  onchain_closed_at: string | null;
  amount: number;
  item_description: string;
  merchant_display_name: string;
  installments: Installment[];
  payments: Payment[];
}

export interface MerchantStats {
  agreement_count: number;
  total_volume: number;
  on_time_rate: number | null;
}

export function getMerchantProfile(apiKey?: string) {
  return request<MerchantProfile>("/api/merchants/me/", apiKey);
}

export function getMerchantAgreements() {
  return request<AgreementDetail[]>("/api/agreements/merchant/");
}

export function getMerchantAgreementDetail(id: string) {
  return request<AgreementDetail>(`/api/agreements/merchant/${id}/`);
}

export function getMerchantStats() {
  return request<MerchantStats>("/api/agreements/merchant/stats/");
}
