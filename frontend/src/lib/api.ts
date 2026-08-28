const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const ACCESS_TOKEN_KEY = "shadowpay:access";
const REFRESH_TOKEN_KEY = "shadowpay:refresh";

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
  body: unknown;
  constructor(status: number, body: unknown) {
    super(typeof body === "object" && body && "detail" in body ? String((body as { detail: unknown }).detail) : `API error ${status}`);
    this.status = status;
    this.body = body;
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
  apiKey?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, apiKey } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (apiKey) {
    headers["Authorization"] = `ApiKey ${apiKey}`;
  } else if (auth) {
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

  if (res.status === 401 && auth && !apiKey) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await doFetch();
    }
  }

  if (!res.ok) {
    let errBody: unknown = null;
    try {
      errBody = await res.json();
    } catch {
      // no JSON body
    }
    throw new ApiError(res.status, errBody);
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
  return request<Challenge>("/api/auth/challenge/", {
    method: "POST",
    auth: false,
    body: { wallet_address: walletAddress },
  });
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

// ---- Risk / eligibility ----

export interface EligibilityWitness {
  check_id: string;
  wallet_age_signal: number;
  repayment_signal: number;
  income_signal: number;
  threshold: number;
  expected_pass: boolean;
}

export function postEligibilityWitness() {
  return request<EligibilityWitness>("/api/risk/eligibility/witness/", { method: "POST" });
}

export function confirmEligibility(checkId: string, passed: boolean, onchainUserKey: string) {
  return request("/api/risk/eligibility/confirm/", {
    method: "POST",
    body: { check_id: checkId, passed, onchain_user_key: onchainUserKey },
  });
}

// ---- Agreements ----

export interface Installment {
  amount: number;
  due_date: string;
}

export interface CreateAgreementWitness {
  agreement_id: string;
  merchant_id: string;
  amount: number;
  installments: Installment[];
  salt: string;
}

export function initiateAgreement(params: {
  merchant_id: string;
  amount: number;
  installments: Installment[];
  item_description: string;
  merchant_display_name: string;
}) {
  return request<CreateAgreementWitness>("/api/agreements/initiate/", {
    method: "POST",
    body: params,
  });
}

export function confirmAgreement(agreementId: string, onchainAgreementId: string, txHash: string) {
  return request(`/api/agreements/${agreementId}/confirm/`, {
    method: "POST",
    body: { onchain_agreement_id: onchainAgreementId, tx_hash: txHash },
  });
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

export function getMyAgreements() {
  return request<AgreementDetail[]>("/api/agreements/mine/");
}

export function getMyAgreementDetail(id: string) {
  return request<AgreementDetail>(`/api/agreements/mine/${id}/`);
}

// ---- Payments (recordPayment) ----

export interface RecordPaymentWitness {
  payment_id: string;
  merchant_id: string;
  amount: number;
  installments: Installment[];
  salt: string;
  installment_index: number;
  payment_date_epoch_day: number;
}

export function initiatePayment(agreementId: string) {
  return request<RecordPaymentWitness>(`/api/agreements/${agreementId}/payments/initiate/`, {
    method: "POST",
  });
}

export function confirmPayment(agreementId: string, paymentId: string, onTime: boolean, txHash: string) {
  return request<AgreementDetail>(`/api/agreements/${agreementId}/payments/${paymentId}/confirm/`, {
    method: "POST",
    body: { on_time: onTime, tx_hash: txHash },
  });
}

// ---- Close (closeAgreement) ----

export interface CloseAgreementWitness {
  agreement_id: string;
  merchant_id: string;
  amount: number;
  installments: Installment[];
  salt: string;
}

export function initiateClose(agreementId: string) {
  return request<CloseAgreementWitness>(`/api/agreements/${agreementId}/close/initiate/`, {
    method: "POST",
  });
}

export function confirmClose(agreementId: string, txHash: string) {
  return request<AgreementDetail>(`/api/agreements/${agreementId}/close/confirm/`, {
    method: "POST",
    body: { tx_hash: txHash },
  });
}

export { API_URL };
