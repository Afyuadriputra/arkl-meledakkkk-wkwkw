from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from devices.models import Device
from exposure.models import (
    ExposureProfile,
    Worker,
)
from exposure.services.inhalation import (
    UnsupportedInhalationMethodologyError,
    resolve_inhalation_methodology,
    sync_worker_exposure_inhalation_rate,
)
from exposure.services.validation import (
    ExposureValidationError,
    validate_exposure_data,
)


class WorkerSerializer(
    serializers.ModelSerializer
):
    name = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=150,
    )

    age = serializers.IntegerField(
        required=True,
        min_value=1,
        max_value=120,
    )

    monitoring_device = (
        serializers.PrimaryKeyRelatedField(
            queryset=Device.objects.filter(
                is_active=True
            ),
            required=False,
            allow_null=True,
        )
    )

    monitoring_device_code = (
        serializers.CharField(
            source="monitoring_device.device_code",
            read_only=True,
            allow_null=True,
        )
    )

    monitoring_device_name = (
        serializers.CharField(
            source="monitoring_device.name",
            read_only=True,
            allow_null=True,
        )
    )

    monitoring_device_location = (
        serializers.CharField(
            source="monitoring_device.location",
            read_only=True,
            allow_null=True,
        )
    )

    class Meta:
        model = Worker

        fields = [
            "id",
            "code",
            "name",
            "age",
            "is_active",
            "monitoring_device",
            "monitoring_device_code",
            "monitoring_device_name",
            "monitoring_device_location",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "monitoring_device_code",
            "monitoring_device_name",
            "monitoring_device_location",
            "created_at",
            "updated_at",
        ]

    def validate_name(
        self,
        value,
    ):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Name cannot be blank."
            )

        return value

    @transaction.atomic
    def update(
        self,
        instance,
        validated_data,
    ):
        previous_age = (
            instance.age
        )

        worker = super().update(
            instance,
            validated_data,
        )

        age_changed = (
            "age" in validated_data
            and worker.age != previous_age
        )

        if age_changed:
            ExposureProfile.objects.filter(worker=worker).update(
                approval_status=ExposureProfile.ApprovalStatus.PENDING,
                reviewed_at=None, reviewed_by=None, review_note="",
            )
            try:
                sync_worker_exposure_inhalation_rate(
                    worker
                )

            except (
                UnsupportedInhalationMethodologyError
            ) as exc:
                raise serializers.ValidationError(
                    {
                        "age": str(exc),
                    }
                ) from exc

        if age_changed or "monitoring_device" in validated_data:
            from arkl.services.profile_refresh import refresh_worker_realtime_risk
            refresh_worker_realtime_risk(worker)

        return worker


class ExposureProfileSerializer(
    serializers.ModelSerializer
):
    calculation_status = serializers.SerializerMethodField()

    def get_calculation_status(self, obj) -> str:
        from arkl.services.profile_refresh import calculation_prerequisite_status

        if hasattr(obj, "_calculation_status"):
            return obj._calculation_status
        return calculation_prerequisite_status(obj.worker)
    worker_code = serializers.CharField(
        source="worker.code",
        read_only=True,
    )

    worker_name = serializers.CharField(
        source="worker.name",
        read_only=True,
        allow_null=True,
    )

    inhalation_category = (
        serializers.SerializerMethodField()
    )

    class Meta:
        model = ExposureProfile

        fields = [
            "id",
            "worker",
            "worker_code",
            "worker_name",
            "body_weight",
            "exposure_time",
            "exposure_frequency",
            "exposure_duration",
            "inhalation_rate",
            "inhalation_category",
            "approval_status",
            "review_note",
            "reviewed_at",
            "reviewed_by",
            "calculation_status",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "worker_code",
            "worker_name",
            "inhalation_rate",
            "inhalation_category",
            "reviewed_at",
            "reviewed_by",
            "calculation_status",
            "created_at",
            "updated_at",
        ]

    @staticmethod
    def _resolve_methodology(
        worker: Worker,
    ):
        if worker.age is None:
            raise serializers.ValidationError(
                {
                    "worker": (
                        "Worker age is required "
                        "before creating or updating "
                        "an exposure profile."
                    )
                }
            )

        try:
            return (
                resolve_inhalation_methodology(
                    worker.age
                )
            )

        except (
            UnsupportedInhalationMethodologyError
        ) as exc:
            raise serializers.ValidationError(
                {
                    "worker": str(exc),
                }
            ) from exc

    def get_inhalation_category(
        self,
        obj,
    ):
        if obj.worker.age is None:
            return None

        try:
            methodology = (
                resolve_inhalation_methodology(
                    obj.worker.age
                )
            )

        except (
            UnsupportedInhalationMethodologyError
        ):
            return None

        return methodology.category

    def _get_worker(
        self,
        attrs,
    ) -> Worker:
        if self.instance is not None:
            return self.instance.worker

        worker = attrs.get(
            "worker"
        )

        if worker is None:
            raise serializers.ValidationError(
                {
                    "worker": (
                        "Worker is required."
                    )
                }
            )

        return worker

    def validate(
        self,
        attrs,
    ):
        instance = self.instance

        if attrs.get("approval_status") == ExposureProfile.ApprovalStatus.REJECTED:
            note = attrs.get("review_note", getattr(instance, "review_note", ""))
            if not note.strip():
                raise serializers.ValidationError({"review_note": "Catatan perbaikan wajib diisi."})

        worker = self._get_worker(
            attrs
        )

        methodology = (
            self._resolve_methodology(
                worker
            )
        )

        inhalation_rate = float(
            methodology.inhalation_rate
        )

        values = {
            "body_weight": attrs.get(
                "body_weight",
                getattr(
                    instance,
                    "body_weight",
                    None,
                ),
            ),
            "exposure_time": attrs.get(
                "exposure_time",
                getattr(
                    instance,
                    "exposure_time",
                    None,
                ),
            ),
            "exposure_frequency": attrs.get(
                "exposure_frequency",
                getattr(
                    instance,
                    "exposure_frequency",
                    None,
                ),
            ),
            "exposure_duration": attrs.get(
                "exposure_duration",
                getattr(
                    instance,
                    "exposure_duration",
                    None,
                ),
            ),
            "inhalation_rate": (
                inhalation_rate
            ),
        }

        try:
            validate_exposure_data(
                **values
            )

        except ExposureValidationError as exc:
            raise serializers.ValidationError(
                {
                    "detail": str(exc),
                }
            ) from exc

        return attrs

    @transaction.atomic
    def create(
        self,
        validated_data,
    ):
        worker = (
            validated_data[
                "worker"
            ]
        )
        worker = Worker.objects.select_for_update().get(pk=worker.pk)
        validated_data["worker"] = worker

        methodology = (
            self._resolve_methodology(
                worker
            )
        )

        profile = (
            ExposureProfile.objects.create(
                **validated_data,
                inhalation_rate=float(
                    methodology.inhalation_rate
                ),
            )
        )

        from arkl.services.profile_refresh import refresh_worker_realtime_risk
        profile._calculation_status = refresh_worker_realtime_risk(worker)
        return profile

    @transaction.atomic
    def update(
        self,
        instance,
        validated_data,
    ):
        methodology = (
            self._resolve_methodology(Worker.objects.select_for_update().get(pk=instance.worker_id))
        )

        for field, value in (
            validated_data.items()
        ):
            setattr(
                instance,
                field,
                value,
            )

        instance.inhalation_rate = float(
            methodology.inhalation_rate
        )

        if "approval_status" in validated_data:
            request = self.context.get("request")
            pending = instance.approval_status == ExposureProfile.ApprovalStatus.PENDING
            instance.reviewed_at = None if pending else timezone.now()
            instance.reviewed_by = None if pending or request is None else request.user

        instance.save()

        from arkl.services.profile_refresh import refresh_worker_realtime_risk
        instance._calculation_status = refresh_worker_realtime_risk(instance.worker)

        return instance
