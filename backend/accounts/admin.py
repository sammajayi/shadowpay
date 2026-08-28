from django.contrib import admin

from .models import User, WalletChallenge

admin.site.register(User)
admin.site.register(WalletChallenge)
