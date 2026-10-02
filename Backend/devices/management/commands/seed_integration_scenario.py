from django.core.management.base import (
    BaseCommand,
)

from devices.models import (
    Device,
    H2SReading,
)


class Command(BaseCommand):
    help = (
        "Seed deterministic H2S data "
        "for frontend-backend integration tests."
    )

    def handle(self, *args, **options):
        device, created = (
            Device.objects.get_or_create(
                device_code="H2S-INTEGRATION-001",
                defaults={
                    "name": (
                        "Integration H2S Sensor"
                    ),
                    "location": (
                        "TPA Muara Fajar "
                        "- Integration Test"
                    ),
                    "is_active": True,
                },
            )
        )

        if not device.is_active:
            device.is_active = True

            device.save(
                update_fields=[
                    "is_active",
                ]
            )

        if created:
            self.stdout.write(
                self.style.SUCCESS(
                    "Created integration device."
                )
            )

        reading = (
            H2SReading.objects.create(
                device=device,
                ppm=25.4,
                adc=1000,
                filtered_adc=1000,
                level=2,
                status="WARNING",
                uptime_ms=1000,
                simulated=True,
            )
        )

        self.stdout.write(
            self.style.SUCCESS(
                "Integration scenario ready."
            )
        )

        self.stdout.write(
            f"Device ID   : {device.id}"
        )

        self.stdout.write(
            f"Device code : {device.device_code}"
        )

        self.stdout.write(
            f"Reading ID  : {reading.id}"
        )

        self.stdout.write(
            f"H2S         : {reading.ppm} ppm"
        )

        self.stdout.write(
            f"Status      : {reading.status}"
        )