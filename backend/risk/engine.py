"""Rules-based risk engine, v1 (scope doc section 4 — "not ML yet").

Produces exactly the three signals the checkEligibility circuit's
`eligibilityScoreInputs()` witness expects, in the same order the
contract's `computeScore` combines them (see
contracts/src/shadowpay.compact): wallet-age signal, past-repayment
signal, self-reported income-bracket signal. Each is capped so the
additive total stays in a small, predictable range regardless of
input size — Uint<32> in the circuit has plenty of headroom, but
keeping scores legible (roughly 0-120 total) matters more than using
the full range.

This module is intentionally a pure function of its inputs so it's
trivial to swap for an ML-based scorer in Wave 2/3 without touching
callers — see EligibilityWitnessView in views.py.
"""

from dataclasses import dataclass

WALLET_AGE_SIGNAL_CAP = 40
REPAYMENT_SIGNAL_CAP = 40
INCOME_SIGNAL_CAP = 40

INCOME_BRACKET_SIGNALS = {
    "unknown": 0,
    "low": 10,
    "medium": 25,
    "high": 40,
}


@dataclass(frozen=True)
class RiskSignals:
    wallet_age_signal: int
    repayment_signal: int
    income_signal: int

    @property
    def total_score(self) -> int:
        return self.wallet_age_signal + self.repayment_signal + self.income_signal

    def as_witness_tuple(self) -> tuple[int, int, int]:
        """Matches the [Uint<32>, Uint<32>, Uint<32>] shape of the
        eligibilityScoreInputs() witness in the contract."""
        return (self.wallet_age_signal, self.repayment_signal, self.income_signal)


def wallet_age_signal(wallet_age_days: int) -> int:
    # Roughly 1 point per month of wallet age, capped.
    points = max(wallet_age_days, 0) // 30
    return min(points, WALLET_AGE_SIGNAL_CAP)


def repayment_signal(on_time_payment_count: int, late_payment_count: int) -> int:
    points = (on_time_payment_count * 5) - (late_payment_count * 8)
    return max(0, min(points, REPAYMENT_SIGNAL_CAP))


def income_signal(income_bracket: str) -> int:
    return INCOME_BRACKET_SIGNALS.get(income_bracket, INCOME_BRACKET_SIGNALS["unknown"])


def compute_signals(
    *, wallet_age_days: int, on_time_payment_count: int, late_payment_count: int, income_bracket: str
) -> RiskSignals:
    return RiskSignals(
        wallet_age_signal=wallet_age_signal(wallet_age_days),
        repayment_signal=repayment_signal(on_time_payment_count, late_payment_count),
        income_signal=income_signal(income_bracket),
    )
