from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from exposure.models import Worker


class AccountProfile(models.Model):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        OPERATOR = "OPERATOR", "Operator"
        RESEARCHER = "RESEARCHER", "Researcher"
        WORKER = "WORKER", "Worker"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="account_profile",
    )

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        db_index=True,
    )

    worker = models.OneToOneField(
        Worker,
        on_delete=models.SET_NULL,
        related_name="account_profile",
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "user__username",
        ]

    def __str__(self):
        return (
            f"{self.user.username} "
            f"({self.role})"
        )

    def clean(self):
        super().clean()

        if (
            self.role == self.Role.WORKER
            and self.worker is None
        ):
            raise ValidationError(
                {
                    "worker": (
                        "WORKER role must be linked "
                        "to a Worker."
                    )
                }
            )

        if (
            self.role != self.Role.WORKER
            and self.worker is not None
        ):
            raise ValidationError(
                {
                    "worker": (
                        "Only WORKER accounts may "
                        "be linked to a Worker."
                    )
                }
            )

    @property
    def is_worker(self):
        return (
            self.role
            == self.Role.WORKER
        )