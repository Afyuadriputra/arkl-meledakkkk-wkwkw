from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from devices.models import H2SReading
from exposure.models import Worker


class ReferenceMeasurement(models.Model):
    """A reported reference-sensor measurement, never an MQTT reading."""
    concentration_ppm = models.DecimalField(
        max_digits=14, decimal_places=6,
        validators=[MinValueValidator(Decimal("0"))],
    )
    measured_at = models.DateTimeField(db_index=True)
    location = models.CharField(max_length=255, blank=True, default="")
    source = models.CharField(max_length=255)
    notes = models.TextField(blank=True, default="")
    workers = models.ManyToManyField(
        Worker, blank=True, related_name="reference_measurements",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        blank=True, related_name="reference_measurements",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-measured_at", "-id"]

    def __str__(self):
        return f"Referensi {self.concentration_ppm} ppm - {self.measured_at}"

    def clean(self):
        super().clean()
        if self.measured_at and self.measured_at > timezone.now():
            raise ValidationError({"measured_at": "Waktu pengukuran tidak boleh di masa depan."})

    def save(self, *args, **kwargs):
        if self.pk and self.arkl_results.exists():
            raise ValidationError("Pengukuran sudah digunakan; tambahkan pengukuran baru agar riwayat tetap utuh.")
        return super().save(*args, **kwargs)


class ARKLResult(models.Model):
    exposure_profile_verified = models.BooleanField(
        null=True, default=None,
        help_text="Status verifikasi profil saat hasil dihitung; null untuk riwayat lama.",
    )
    class CalculationType(models.TextChoices):
        REALTIME = "REALTIME", "Realtime"
        HISTORICAL = "HISTORICAL", "Historical"
        REFERENCE = "REFERENCE", "Sensor referensi"

    reference_measurement = models.ForeignKey(
        ReferenceMeasurement, on_delete=models.PROTECT, null=True,
        blank=True, related_name="arkl_results",
    )

    worker = models.ForeignKey(
        Worker,
        on_delete=models.PROTECT,
        related_name="arkl_results",
    )

    reading = models.ForeignKey(
        H2SReading,
        on_delete=models.PROTECT,
        related_name="arkl_results",
        null=True,
        blank=True,
    )

    calculation_type = models.CharField(
        max_length=20,
        choices=CalculationType.choices,
    )

    concentration_ppm = models.DecimalField(
        max_digits=14,
        decimal_places=6,
    )

    concentration_mg_m3 = models.DecimalField(
        max_digits=14,
        decimal_places=6,
    )

    exposure_concentration_mg_m3 = models.DecimalField(
        max_digits=14,
        decimal_places=6,
        null=True,
        blank=True,
    )

    # Research / exposure snapshot fields.
    body_weight = models.DecimalField(
        max_digits=10,
        decimal_places=4,
    )

    exposure_time = models.DecimalField(
        max_digits=10,
        decimal_places=4,
    )

    exposure_frequency = models.DecimalField(
        max_digits=10,
        decimal_places=4,
    )

    exposure_duration = models.DecimalField(
        max_digits=10,
        decimal_places=4,
    )

    inhalation_rate = models.DecimalField(
        max_digits=10,
        decimal_places=4,
    )

    # Legacy v1.0 calculation fields.
    averaging_time = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        null=True,
        blank=True,
    )

    intake = models.DecimalField(
        max_digits=24,
        decimal_places=12,
        null=True,
        blank=True,
    )

    rfc = models.DecimalField(
        max_digits=14,
        decimal_places=8,
    )

    rq = models.DecimalField(
        max_digits=24,
        decimal_places=12,
    )

    interpretation = models.CharField(
        max_length=50,
    )

    calculation_version = models.CharField(
        max_length=30,
    )

    source_simulated = models.BooleanField(
        default=False,
    )

    period_start = models.DateTimeField(
        null=True,
        blank=True,
    )

    period_end = models.DateTimeField(
        null=True,
        blank=True,
    )

    reading_count = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.calculation_type} {self.worker.code} RQ={self.rq}"
