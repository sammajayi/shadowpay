from django.contrib import admin

from .models import EligibilityCheck, RiskConfig, RiskProfile

admin.site.register(RiskProfile)
admin.site.register(EligibilityCheck)
admin.site.register(RiskConfig)
