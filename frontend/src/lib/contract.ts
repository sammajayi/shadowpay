/**
 * Client-side Compact circuit execution.
 *
 * NOT YET WIRED TO THE REAL CONTRACT. Running `checkEligibility` and
 * `createAgreement` for real requires the `@midnight-ntwrk/midnight-js-contracts`
 * (or equivalent) runtime, the compiled contract artifacts from
 * `contracts/build/`, and a deployed contract address + the prover/
 * indexer service URIs the wallet's `getConfiguration()` call returns
 * (see lib/wallet.ts) — none of which exist yet (no testnet
 * deployment has happened). Building that integration is real,
 * non-trivial work that deserves its own pass rather than being
 * bolted on silently here.
 *
 * These functions simulate proof generation (the multi-second delay
 * the scope doc's UX copy prompt calls out — "Generating privacy
 * proof…") and return plausible-shaped results, so every screen that
 * depends on this can be built and reviewed now against the real
 * shape the eventual contract calls will return. Swap the bodies
 * for real `@midnight-ntwrk` calls once the contract is deployed;
 * callers (checkout page, agreement page) shouldn't need to change.
 */

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface CheckEligibilityResult {
  passed: boolean;
  onchainUserKey: string;
  txHash: string;
}

export async function runCheckEligibilityCircuit(params: {
  walletAgeSignal: number;
  repaymentSignal: number;
  incomeSignal: number;
  threshold: number;
}): Promise<CheckEligibilityResult> {
  await delay(2500);
  const score = params.walletAgeSignal + params.repaymentSignal + params.incomeSignal;
  return {
    passed: score >= params.threshold,
    onchainUserKey: randomHex(32),
    txHash: `0x${randomHex(32)}`,
  };
}

export interface CreateAgreementResult {
  onchainAgreementId: string;
  txHash: string;
}

export async function runCreateAgreementCircuit(): Promise<CreateAgreementResult> {
  await delay(3000);
  return {
    onchainAgreementId: randomHex(32),
    txHash: `0x${randomHex(32)}`,
  };
}

export interface RecordPaymentResult {
  onTime: boolean;
  txHash: string;
}

export async function runRecordPaymentCircuit(params: {
  dueDateEpochDay: number;
  paymentDateEpochDay: number;
}): Promise<RecordPaymentResult> {
  await delay(2500);
  return {
    onTime: params.paymentDateEpochDay <= params.dueDateEpochDay,
    txHash: `0x${randomHex(32)}`,
  };
}

export interface CloseAgreementResult {
  txHash: string;
}

export async function runCloseAgreementCircuit(): Promise<CloseAgreementResult> {
  await delay(2500);
  return {
    txHash: `0x${randomHex(32)}`,
  };
}
