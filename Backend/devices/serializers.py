from rest_framework import serializers

from devices.models import (
    Device,
    H2SReading,
)


class DeviceSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = Device

        fields = [
            "id",
            "device_code",
            "name",
            "location",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate_device_code(
        self,
        value,
    ):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Device code cannot be blank."
            )

        if (
            self.instance is not None
            and value
            != self.instance.device_code
        ):
            raise serializers.ValidationError(
                "Device code cannot be changed."
            )

        return value

    def validate_name(
        self,
        value,
    ):
        return value.strip()

    def validate_location(
        self,
        value,
    ):
        return value.strip()


class H2SReadingSerializer(
    serializers.ModelSerializer
):
    device_code = serializers.CharField(
        source="device.device_code",
        read_only=True,
    )

    class Meta:
        model = H2SReading

        fields = [
            "id",
            "device",
            "device_code",
            "ppm",
            "adc",
            "filtered_adc",
            "level",
            "status",
            "uptime_ms",
            "simulated",
            "received_at",
        ]

        read_only_fields = fields