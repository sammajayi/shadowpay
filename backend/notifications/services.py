"""Notification service — repayment reminders via Resend (scope doc
section 4, "matching your existing stack"). Never includes the
purchase amount or merchant name in the email body/subject unless the
user is the recipient (this service is only ever called with the
owning user as the target — there is no path where a notification
goes to anyone else about someone else's agreement)."""

from __future__ import annotations

import json
import urllib.error
import urllib.request

from django.conf import settings

from .models import NotificationLog

RESEND_API_URL = "https://api.resend.com/emails"


def send_repayment_reminder(*, user, installment_index: int, due_date: str) -> NotificationLog:
    log = NotificationLog(user=user, kind=NotificationLog.Kind.REPAYMENT_REMINDER)

    if not settings.RESEND_API_KEY:
        log.success = False
        log.error = "RESEND_API_KEY not configured"
        log.save()
        return log

    if not user.email:
        log.success = False
        log.error = "user has no email on file"
        log.save()
        return log

    body = {
        "from": settings.NOTIFICATIONS_FROM_EMAIL,
        "to": [user.email],
        "subject": "ShadowPay: upcoming installment due",
        "html": (
            f"<p>Installment {installment_index + 1} is due on {due_date}. "
            "Log in to ShadowPay to pay it and keep your on-time record.</p>"
        ),
    }
    request = urllib.request.Request(
        RESEND_API_URL,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=10):
            log.success = True
    except urllib.error.URLError as exc:
        log.success = False
        log.error = str(exc)

    log.save()
    return log
