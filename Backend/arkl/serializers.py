from drf_spectacular.utils import (
    extend_schema_field,
)
from rest_framework import serializers

from alerts.serializers import (
    AlertEvaluationResponseSerializer,
)
from arkl.models import ARKLResult, ReferenceMeasurement
from django.db import transaction
from django.utils import timezone
from devices.models import Device
from exposure.models import Worker


class RealtimeARKLRequestSerializer(
    serializers.Serializer
):
    worker = (
        serializers.PrimaryKeyRelatedField(
            queryset=(
                Worker.objects
                .filter(
                    is_active=True
                )
            ),
        )
    )

    device = (
        serializers.PrimaryKeyRelatedField(
            queryset=(
                Device.objects
                .filter(
                    is_active=True
                )
            ),
        )
    )


class HistoricalARKLRequestSerializer(
    serializers.Serializer
):
    worker = (
        serializers.PrimaryKeyRelatedField(
            queryset=(
                Worker.objects
                .filter(
                    is_active=True
                )
            ),
        )
    )

    device = (
        serializers.PrimaryKeyRelatedField(
            queryset=(
                Device.objects
                .filter(
                    is_active=True
                )
            ),
        )
    )

    start_time = (
        serializers.DateTimeField()
    )

    end_time = (
        serializers.DateTimeField()
    )

    def validate(
        self,
        attrs,
    ):
        if (
            attrs["start_time"]
            >= attrs["end_time"]
        ):
            raise serializers.ValidationError(
                {
                    "end_time": (
                        "end_time must be later "
                        "than start_time."
                    )
                }
            )

        return attrs


class ReferenceMeasurementSerializer(serializers.ModelSerializer):
    used = serializers.SerializerMethodField()
    workers = serializers.PrimaryKeyRelatedField(queryset=Worker.objects.filter(is_active=True), many=True, required=False)

    class Meta:
        model = ReferenceMeasurement
        fields = ["id", "concentration_ppm", "measured_at", "location", "source", "notes", "workers", "created_at", "used"]
        read_only_fields = ["id", "created_at", "used"]

    def get_used(self, obj) -> bool:
        return obj.arkl_results.exists()

    def validate_measured_at(self, value):
        if value > timezone.now():
            raise serializers.ValidationError("Waktu pengukuran tidak boleh di masa depan.")
        return value

    @transaction.atomic
    def update(self, instance, validated_data):
        instance = ReferenceMeasurement.objects.select_for_update().get(pk=instance.pk)
        if instance.arkl_results.exists():
            raise serializers.ValidationError("Pengukuran sudah digunakan. Tambahkan pengukuran baru agar riwayat tidak berubah.")
        return super().update(instance, validated_data)


class ReferenceARKLRequestSerializer(serializers.Serializer):
    worker = serializers.PrimaryKeyRelatedField(queryset=Worker.objects.filter(is_active=True))
    measurement = serializers.PrimaryKeyRelatedField(queryset=ReferenceMeasurement.objects.all())


class ReferenceMeasurementSnapshotSerializer(serializers.ModelSerializer):
    """Worker-visible provenance; never expose other assigned worker IDs."""
    class Meta:
        model = ReferenceMeasurement
        fields = ["id", "concentration_ppm", "measured_at", "location", "source"]
        read_only_fields = fields


class ARKLResultSerializer(
    serializers.ModelSerializer
):
    reading_received_at = serializers.DateTimeField(
        source="reading.received_at", read_only=True, allow_null=True,
    )
    reference_measurement = ReferenceMeasurementSnapshotSerializer(read_only=True, allow_null=True)
    worker_code = (
        serializers.CharField(
            source="worker.code",
            read_only=True,
        )
    )

    device_code = (
        serializers.SerializerMethodField()
    )

    class Meta:
        model = ARKLResult

        fields = [
            "id",
            "worker",
            "worker_code",
            "reading",
            "reading_received_at",
            "reference_measurement",
            "device_code",
            "calculation_type",
            "exposure_profile_verified",
            "concentration_ppm",
            "concentration_mg_m3",
            "exposure_concentration_mg_m3",
            "body_weight",
            "exposure_time",
            "exposure_frequency",
            "exposure_duration",
            "inhalation_rate",
            "averaging_time",
            "intake",
            "rfc",
            "rq",
            "interpretation",
            "calculation_version",
            "source_simulated",
            "period_start",
            "period_end",
            "reading_count",
            "created_at",
        ]

        read_only_fields = fields

    @extend_schema_field(
        serializers.CharField(
            allow_null=True,
        )
    )
    def get_device_code(
        self,
        obj: ARKLResult,
    ) -> str | None:
        if (
            obj.reading_id
            is None
        ):
            return None

        return (
            obj.reading
            .device
            .device_code
        )


class RealtimeARKLResponseSerializer(
    serializers.Serializer
):
    """
    Response from one realtime ARKL
    orchestration request.
    """

    arkl_result = (
        ARKLResultSerializer()
    )

    alert_evaluation = (
        AlertEvaluationResponseSerializer()
    )
