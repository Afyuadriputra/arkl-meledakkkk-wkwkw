from django.db import models


class Device(models.Model):
    device_code = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
    )
    name = models.CharField(
        max_length=150,
        blank=True,
    )
    location = models.CharField(
        max_length=255,
        blank=True,
    )
    is_active = models.BooleanField(
        default=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["device_code"]

    def __str__(self):
        return self.device_code


class H2SReading(models.Model):
    device = models.ForeignKey(
        Device,
        on_delete=models.PROTECT,
        related_name="readings",
    )

    ppm = models.FloatField()
    adc = models.PositiveIntegerField()
    filtered_adc = models.FloatField()

    level = models.PositiveSmallIntegerField()
    status = models.CharField(
        max_length=50,
    )

    uptime_ms = models.PositiveBigIntegerField()

    simulated = models.BooleanField(
        default=True,
    )

    received_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        ordering = ["-received_at"]
        indexes = [
            models.Index(
                fields=["device", "-received_at"],
                name="h2s_device_time_idx",
            ),
        ]

    def __str__(self):
        return f"{self.device.device_code} - {self.ppm:.2f} ppm"
