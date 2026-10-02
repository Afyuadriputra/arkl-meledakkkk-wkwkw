from django.conf import settings
from django.core.validators import (
    MaxValueValidator,
    MinValueValidator,
)
from django.db import models


class Worker(models.Model):
    code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
    )

    name = models.CharField(
        max_length=150,
        null=True,
        blank=True,
        help_text=(
            "Nama pemulung/responden."
        ),
    )

    age = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[
            MinValueValidator(1),
            MaxValueValidator(120),
        ],
        help_text=(
            "Usia pemulung/responden dalam tahun. "
            "Usia digunakan untuk menentukan "
            "kategori metodologis laju inhalasi."
        ),
    )

    is_active = models.BooleanField(
        default=True,
    )

    monitoring_device = models.ForeignKey(
        "devices.Device",
        on_delete=models.SET_NULL,
        related_name="monitored_workers",
        null=True,
        blank=True,
        help_text=(
            "Perangkat H2S yang digunakan untuk "
            "monitoring lingkungan pemulung."
        ),
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["code"]

    def __str__(self):
        if self.name:
            return (
                f"{self.code} - "
                f"{self.name}"
            )

        return self.code


class ExposureProfile(models.Model):
    class ApprovalStatus(models.TextChoices):
        PENDING = "PENDING", "Menunggu ACC"
        APPROVED = "APPROVED", "Disetujui"
        REJECTED = "REJECTED", "Perlu perbaikan"

    # Existing profiles and trusted staff/ORM creation retain their eligibility.
    # Personal worker writes explicitly set PENDING; workers cannot self-approve.
    approval_status = models.CharField(
        max_length=12, choices=ApprovalStatus.choices,
        default=ApprovalStatus.APPROVED, db_index=True,
    )
    review_note = models.TextField(blank=True, default="")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="reviewed_exposure_profiles",
    )

    worker = models.OneToOneField(
        Worker,
        on_delete=models.CASCADE,
        related_name="exposure_profile",
    )

    # Wb
    body_weight = models.FloatField(
        validators=[
            MinValueValidator(0.01),
        ],
        help_text=(
            "Berat badan (Wb) dalam kilogram."
        ),
    )

    # tE
    exposure_time = models.FloatField(
        validators=[
            MinValueValidator(0.01),
            MaxValueValidator(24),
        ],
        help_text=(
            "Waktu pajanan (tE) "
            "dalam jam/hari."
        ),
    )

    # fE
    exposure_frequency = models.FloatField(
        validators=[
            MinValueValidator(0.01),
            MaxValueValidator(365),
        ],
        help_text=(
            "Frekuensi pajanan (fE) "
            "dalam hari/tahun."
        ),
    )

    # Dt
    exposure_duration = models.FloatField(
        validators=[
            MinValueValidator(0.01),
        ],
        help_text=(
            "Durasi pajanan (Dt) "
            "dalam tahun."
        ),
    )

    # R
    inhalation_rate = models.FloatField(
        validators=[
            MinValueValidator(0.01),
        ],
        help_text=(
            "Laju inhalasi (R) dalam m³/jam. "
            "Nilai ditentukan otomatis berdasarkan "
            "kategori usia dan metodologi ARKL "
            "yang disetujui."
        ),
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    def __str__(self):
        return (
            "Exposure Profile - "
            f"{self.worker.code}"
        )
