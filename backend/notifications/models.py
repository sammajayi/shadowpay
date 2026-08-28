import uuid

from django.conf import settings
from django.db import models


class NotificationLog(models.Model):
    class Kind(models.TextChoices):
        REPAYMENT_REMINDER = "repayment_reminder", "Repayment reminder"
        AGREEMENT_CONFIRMED = "agreement_confirmed", "Agreement confirmed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    kind = models.CharField(max_length=32, choices=Kind.choices)
    sent_at = models.DateTimeField(auto_now_add=True)
    success = models.BooleanField(default=False)
    error = models.TextField(blank=True, default="")
