from django.contrib import admin

from accounts.models import AccountProfile


@admin.register(AccountProfile)
class AccountProfileAdmin(
    admin.ModelAdmin
):
    list_display = (
        "user",
        "role",
        "worker",
        "created_at",
    )

    list_filter = (
        "role",
    )

    search_fields = (
        "user__username",
        "user__email",
        "worker__code",
        "worker__name",
    )