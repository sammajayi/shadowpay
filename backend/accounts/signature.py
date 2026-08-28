"""Wallet-signature verification for the Lace-wallet auth challenge.

IMPORTANT / integration note: Lace signs messages using a CIP-8
COSE_Sign1 envelope (Cardano-derived), not a bare Ed25519 signature
over raw bytes. Verifying that envelope correctly requires parsing
CBOR/COSE and is tied to exactly what the frontend's wallet-connect
call sends us — details that depend on the frontend wallet
integration (build order item 3), not yet built.

To keep this backend buildable and testable now without silently
pretending to a level of correctness we haven't wired up yet, this
module verifies a raw Ed25519 signature over the exact challenge
message, and treats `wallet_address` as the hex-encoded Ed25519
public key. Swap `Ed25519SignatureVerifier` for a real
`CoseSign1SignatureVerifier` (parsing the COSE_Sign1 payload Lace
actually returns from `api.signData`) once the frontend wallet
connect flow is implemented — the `WalletSignatureVerifier`
interface below is exactly the seam for that swap.
"""

from __future__ import annotations

import abc

import nacl.exceptions
import nacl.signing


class WalletSignatureVerifier(abc.ABC):
    @abc.abstractmethod
    def verify(self, *, wallet_address: str, message: str, signature: str) -> bool:
        """Return True iff `signature` is a valid signature of `message`
        by the key associated with `wallet_address`."""


class Ed25519SignatureVerifier(WalletSignatureVerifier):
    def verify(self, *, wallet_address: str, message: str, signature: str) -> bool:
        try:
            public_key_bytes = bytes.fromhex(wallet_address.removeprefix("0x"))
            signature_bytes = bytes.fromhex(signature.removeprefix("0x"))
        except ValueError:
            return False

        try:
            verify_key = nacl.signing.VerifyKey(public_key_bytes)
            verify_key.verify(message.encode("utf-8"), signature_bytes)
            return True
        except (nacl.exceptions.BadSignatureError, ValueError):
            return False


def get_verifier() -> WalletSignatureVerifier:
    return Ed25519SignatureVerifier()
