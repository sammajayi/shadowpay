"""Agreement orchestration service (scope doc section 4).

Important architectural note: proof generation for createAgreement
MUST happen client-side. The circuit's witnesses (`purchaseDetails`,
`agreementSalt`, and `localSecretKey` for the buyer's pseudonymous
key) depend on the user's local secret key, which lives in their Lace
wallet and never reaches this backend. So this service does not, and
cannot, submit the transaction itself — its job is:

  1. `initiate()` — validate the purchase server-side (merchant is
     verified, pool has liquidity), persist an encrypted off-chain
     record, and hand back exactly the witness payload the frontend
     needs to build the createAgreement proof.
  2. `confirm()` — once the frontend has run the circuit and
     submitted the transaction, record the resulting public
     agreement id against our off-chain record.

This mirrors the eligibility flow in risk/views.py: this backend is
the risk/business-logic authority, the frontend+wallet is the prover.
"""

from __future__ import annotations

import secrets
from dataclasses import dataclass
from datetime import date

from django.db import transaction

from merchants.models import Merchant

from .models import Agreement, Payment


class MerchantNotVerified(Exception):
    pass


class InvalidInstallmentSchedule(Exception):
    pass


class AgreementNotActive(Exception):
    pass


class InstallmentOutOfOrder(Exception):
    pass


class AgreementNotReadyToClose(Exception):
    pass


class AgreementAlreadyClosed(Exception):
    pass


@dataclass(frozen=True)
class CreateAgreementWitnessPayload:
    """Exactly the shape the frontend needs to answer the
    purchaseDetails() and agreementSalt() witnesses."""

    agreement_id: str  # off-chain PK, not the on-chain agreementId
    merchant_id: str  # onchain_merchant_id — the private merchantId witness field
    amount: int
    installments: list[dict]
    salt: str


def initiate_agreement(
    *,
    user,
    merchant: Merchant,
    amount: int,
    installments: list[dict],
    item_description: str,
    merchant_display_name: str,
) -> CreateAgreementWitnessPayload:
    if not merchant.verified:
        raise MerchantNotVerified(f"merchant {merchant.id} is not verified")
    if len(installments) != 4:
        raise InvalidInstallmentSchedule("expected exactly 4 installments (Pay in 4)")
    if sum(i["amount"] for i in installments) != amount:
        raise InvalidInstallmentSchedule("installment amounts must sum to the purchase amount")

    salt = secrets.token_hex(32)

    with transaction.atomic():
        agreement = Agreement(user=user, merchant=merchant, salt=salt)
        agreement.set_amount(amount)
        agreement.set_item_description(item_description)
        agreement.set_merchant_display_name(merchant_display_name)
        agreement.set_installments(installments)
        agreement.save()

    return CreateAgreementWitnessPayload(
        agreement_id=str(agreement.id),
        merchant_id=merchant.onchain_merchant_id,
        amount=amount,
        installments=installments,
        salt=salt,
    )


def confirm_agreement(*, agreement: Agreement, onchain_agreement_id: str, tx_hash: str) -> Agreement:
    from django.utils import timezone

    agreement.onchain_agreement_id = onchain_agreement_id
    agreement.onchain_tx_hash = tx_hash
    agreement.status = Agreement.Status.ACTIVE
    agreement.confirmed_at = timezone.now()
    agreement.save(update_fields=["onchain_agreement_id", "onchain_tx_hash", "status", "confirmed_at"])
    return agreement


_EPOCH = date(1970, 1, 1)


def to_epoch_day(d: date) -> int:
    """Matches the Uint<32> day-number encoding recordPayment's
    `paymentDate` witness and each Installment's `dueDate` use in the
    contract — both sides of an on-time comparison need the same unit."""
    return (d - _EPOCH).days


@dataclass(frozen=True)
class RecordPaymentWitnessPayload:
    """Exactly the shape the frontend needs to answer recordPayment's
    witnesses: the same purchaseDetails()/agreementSalt() createAgreement
    used (to recompute the same agreementId), plus which installment and
    when."""

    payment_id: str  # off-chain PK
    merchant_id: str
    amount: int
    installments: list[dict]
    salt: str
    installment_index: int
    payment_date_epoch_day: int


def initiate_payment(*, agreement: Agreement) -> RecordPaymentWitnessPayload:
    if agreement.status != Agreement.Status.ACTIVE:
        raise AgreementNotActive(f"agreement {agreement.id} is not active")

    next_index = agreement.payments.filter(paid_at__isnull=False).count()
    if next_index >= 4:
        raise InstallmentOutOfOrder("all installments already paid")

    schedule = agreement.get_installments()
    installment = schedule[next_index]

    payment, _ = Payment.objects.get_or_create(
        agreement=agreement,
        installment_index=next_index,
        defaults={"due_date": installment["due_date"]},
    )
    if not payment.encrypted_amount:
        payment.set_amount(installment["amount"])
        payment.save(update_fields=["encrypted_amount"])

    return RecordPaymentWitnessPayload(
        payment_id=str(payment.id),
        merchant_id=agreement.merchant.onchain_merchant_id,
        amount=agreement.get_amount(),
        installments=schedule,
        salt=agreement.salt,
        installment_index=next_index,
        payment_date_epoch_day=to_epoch_day(date.today()),
    )


def confirm_payment(*, payment: Payment, on_time: bool, tx_hash: str) -> Payment:
    from django.utils import timezone

    payment.on_time = on_time
    payment.paid_at = timezone.now()
    payment.onchain_tx_hash = tx_hash
    payment.save(update_fields=["on_time", "paid_at", "onchain_tx_hash"])

    agreement = payment.agreement
    if agreement.payments.filter(paid_at__isnull=False).count() >= 4:
        agreement.status = Agreement.Status.COMPLETED
        agreement.save(update_fields=["status"])

    return payment


@dataclass(frozen=True)
class CloseAgreementWitnessPayload:
    """Same purchaseDetails()/agreementSalt() witnesses as
    createAgreement/recordPayment, so closeAgreement recomputes the
    identical agreementId — no separate 'which agreement' input."""

    agreement_id: str  # off-chain PK
    merchant_id: str
    amount: int
    installments: list[dict]
    salt: str


def initiate_close(*, agreement: Agreement) -> CloseAgreementWitnessPayload:
    if agreement.onchain_closed_at:
        raise AgreementAlreadyClosed(f"agreement {agreement.id} is already closed")
    if agreement.status != Agreement.Status.COMPLETED:
        raise AgreementNotReadyToClose(
            f"agreement {agreement.id} is not ready to close — not all installments are paid"
        )

    return CloseAgreementWitnessPayload(
        agreement_id=str(agreement.id),
        merchant_id=agreement.merchant.onchain_merchant_id,
        amount=agreement.get_amount(),
        installments=agreement.get_installments(),
        salt=agreement.salt,
    )


def confirm_close(*, agreement: Agreement, tx_hash: str) -> Agreement:
    from django.utils import timezone

    agreement.onchain_closed_at = timezone.now()
    agreement.onchain_close_tx_hash = tx_hash
    agreement.save(update_fields=["onchain_closed_at", "onchain_close_tx_hash"])
    return agreement
