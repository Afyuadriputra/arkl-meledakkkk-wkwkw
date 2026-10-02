from django.contrib.auth import (
    authenticate,
    get_user_model,
)

from django.db import transaction

from exposure.services.inhalation import (
    UnsupportedInhalationMethodologyError,
    resolve_inhalation_methodology,
    sync_worker_exposure_inhalation_rate,
)

from devices.serializers import (
    DeviceSerializer,
    H2SReadingSerializer,
)

from django.contrib.auth.password_validation import (
    validate_password,
)
from rest_framework import serializers

from accounts.models import AccountProfile
from accounts.services import create_account
from exposure.serializers import ExposureProfileSerializer
from exposure.models import (
    ExposureProfile,
    Worker,
)


User = get_user_model()


class AccountProfileSerializer(
    serializers.ModelSerializer
):
    username = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    email = serializers.EmailField(
        source="user.email",
        read_only=True,
    )

    worker_code = serializers.CharField(
        source="worker.code",
        read_only=True,
        allow_null=True,
    )

    worker_name = serializers.CharField(
        source="worker.name",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = AccountProfile

        fields = [
            "id",
            "username",
            "email",
            "role",
            "worker",
            "worker_code",
            "worker_name",
            "created_at",
            "updated_at",
        ]

        read_only_fields = fields


class AccountCreateSerializer(
    serializers.Serializer
):
    username = serializers.CharField(
        max_length=150,
    )

    email = serializers.EmailField(
        required=False,
        allow_blank=True,
        default="",
    )

    password = serializers.CharField(
        write_only=True,
        min_length=8,
    )

    role = serializers.ChoiceField(
        choices=AccountProfile.Role.choices,
    )

    worker_id = serializers.IntegerField(
        required=False,
        allow_null=True,
    )

    def validate_username(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Username cannot be blank."
            )

        if User.objects.filter(
            username=value
        ).exists():
            raise serializers.ValidationError(
                "Username already exists."
            )

        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        role = attrs["role"]
        worker_id = attrs.get(
            "worker_id"
        )

        if (
            role
            == AccountProfile.Role.WORKER
            and worker_id is None
        ):
            raise serializers.ValidationError(
                {
                    "worker_id": (
                        "WORKER role requires "
                        "worker_id."
                    )
                }
            )

        if (
            role
            != AccountProfile.Role.WORKER
            and worker_id is not None
        ):
            raise serializers.ValidationError(
                {
                    "worker_id": (
                        "worker_id is only valid "
                        "for WORKER role."
                    )
                }
            )

        if worker_id is not None:
            try:
                worker = Worker.objects.get(
                    pk=worker_id,
                    is_active=True,
                )
            except Worker.DoesNotExist as exc:
                raise serializers.ValidationError(
                    {
                        "worker_id": (
                            "Active Worker not found."
                        )
                    }
                ) from exc

            if AccountProfile.objects.filter(
                worker=worker
            ).exists():
                raise serializers.ValidationError(
                    {
                        "worker_id": (
                            "Worker is already linked "
                            "to an account."
                        )
                    }
                )

            attrs["worker"] = worker

        return attrs

    def create(self, validated_data):
        validated_data.pop(
            "worker_id",
            None,
        )

        result = create_account(
            username=validated_data[
                "username"
            ],
            password=validated_data[
                "password"
            ],
            email=validated_data.get(
                "email",
                "",
            ),
            role=validated_data[
                "role"
            ],
            worker=validated_data.get(
                "worker"
            ),
        )

        return result.profile


class LoginSerializer(
    serializers.Serializer
):
    username = serializers.CharField()

    password = serializers.CharField(
        write_only=True,
    )

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get(
                "request"
            ),
            username=attrs["username"],
            password=attrs["password"],
        )

        if user is None:
            raise serializers.ValidationError(
                "Invalid username or password."
            )

        if not user.is_active:
            raise serializers.ValidationError(
                "User account is inactive."
            )

        attrs["user"] = user

        return attrs


class CurrentUserSerializer(
    serializers.Serializer
):
    id = serializers.IntegerField()

    username = serializers.CharField()

    email = serializers.EmailField(
        allow_blank=True,
    )

    role = serializers.CharField()

    worker_id = serializers.IntegerField(
        allow_null=True,
    )

    worker_code = serializers.CharField(
        allow_null=True,
    )

    worker_name = serializers.CharField(
        allow_null=True,
    )


class LoginResponseSerializer(
    serializers.Serializer
):
    token = serializers.CharField()

    user = CurrentUserSerializer()

class MyWorkerProfileSerializer(
    serializers.ModelSerializer
):
    name = serializers.CharField(
        required=False,
        allow_blank=False,
        allow_null=False,
        max_length=150,
    )

    age = serializers.IntegerField(
        required=False,
        allow_null=False,
        min_value=1,
        max_value=120,
    )

    monitoring_device_code = (
        serializers.CharField(
            source=(
                "monitoring_device.device_code"
            ),
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
            "monitoring_device_code",
            "monitoring_device_name",
            "monitoring_device_location",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "code",
            "is_active",
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

            from arkl.services.profile_refresh import refresh_worker_realtime_risk
            refresh_worker_realtime_risk(worker)

        return worker

class MyExposureProfileSerializer(ExposureProfileSerializer):
    """Personal profile: ownership and review fields cannot be supplied by workers."""

    class Meta(ExposureProfileSerializer.Meta):
        fields = [field for field in ExposureProfileSerializer.Meta.fields if field != "worker"]
        read_only_fields = ExposureProfileSerializer.Meta.read_only_fields + [
            "approval_status", "review_note",
        ]

    def _get_worker(self, attrs):
        if self.instance is not None:
            return self.instance.worker
        worker = self.context.get("worker")
        if worker is None:
            raise serializers.ValidationError("Linked worker is required.")
        return worker

    def create(self, validated_data):
        validated_data["approval_status"] = ExposureProfile.ApprovalStatus.PENDING
        validated_data["review_note"] = ""
        return super().create(validated_data)

    def update(self, instance, validated_data):
        changed = any(
            getattr(instance, field) != value
            for field, value in validated_data.items()
        )
        if changed:
            validated_data.update(
                approval_status=ExposureProfile.ApprovalStatus.PENDING,
                review_note="", reviewed_at=None, reviewed_by=None,
            )
        return super().update(instance, validated_data)

    
class MyMonitoringSerializer(
    serializers.Serializer
):
    device = DeviceSerializer(
        read_only=True,
    )

    reading = H2SReadingSerializer(
        read_only=True,
        allow_null=True,
    )
