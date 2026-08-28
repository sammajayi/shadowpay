/**
 * Lace (Midnight) wallet connector.
 *
 * Per the Midnight DApp connector API docs, injected wallets are
 * enumerated under `window.midnight` by a UUID key — NOT a fixed
 * name like `window.midnight.mnLace` — because a hardcoded key can
 * resolve to undefined depending on wallet version. So we always
 * discover the wallet via `Object.values(window.midnight)`.
 *
 * INTEGRATION NOTE: the connector API's documented surface covers
 * balances/addresses/transfers/intents/tx submission, but arbitrary
 * message signing (what we need for the wallet-auth challenge in
 * accounts/signature.py on the backend) isn't in the page we could
 * confirm signatures against at the time this was written. `signMessage`
 * below is a best-effort name pending verification against the actual
 * `@midnight-ntwrk/dapp-connector-api` types once this is tested
 * against a real Lace install — this is the frontend half of the same
 * seam flagged in backend/accounts/signature.py.
 */

import { useSyncExternalStore } from "react";

export interface MidnightConnectedApi {
  getUnshieldedAddress(): Promise<string>;
  signMessage?(message: string): Promise<string>;
  [key: string]: unknown;
}

export interface MidnightInitialApi {
  name: string;
  icon: string;
  apiVersion: string;
  connect(networkId: string): Promise<MidnightConnectedApi>;
}

declare global {
  interface Window {
    midnight?: Record<string, MidnightInitialApi>;
  }
}

const NETWORK_ID = process.env.NEXT_PUBLIC_MIDNIGHT_NETWORK_ID ?? "TestNet";

export class WalletNotFoundError extends Error {
  constructor() {
    super("No Midnight wallet extension detected. Install Lace to continue.");
    this.name = "WalletNotFoundError";
  }
}

function discoverWallet(): MidnightInitialApi {
  if (typeof window === "undefined" || !window.midnight) {
    throw new WalletNotFoundError();
  }
  const wallets = Object.values(window.midnight);
  const lace = wallets.find((w) => w.name?.toLowerCase().includes("lace")) ?? wallets[0];
  if (!lace) {
    throw new WalletNotFoundError();
  }
  return lace;
}

export async function connectWallet(): Promise<{ address: string; api: MidnightConnectedApi }> {
  const initialApi = discoverWallet();
  const api = await initialApi.connect(NETWORK_ID);
  const address = await api.getUnshieldedAddress();
  return { address, api };
}

export async function signChallenge(api: MidnightConnectedApi, message: string): Promise<string> {
  if (typeof api.signMessage !== "function") {
    throw new Error(
      "This wallet build does not expose signMessage() — see the integration note in lib/wallet.ts"
    );
  }
  return api.signMessage(message);
}

export function isWalletAvailable(): boolean {
  return typeof window !== "undefined" && !!window.midnight && Object.keys(window.midnight).length > 0;
}

// useSyncExternalStore rather than a useState+useEffect pair: reading
// `window` in render would mismatch server vs. client (SSR always
// sees no wallet), and this is exactly the primitive React provides
// for "browser-only value that needs a different snapshot during
// SSR" without that mismatch or an extra re-render.
export function useWalletAvailable(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => isWalletAvailable(),
    () => false
  );
}
