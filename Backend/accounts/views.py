from django.db import transaction
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import (
    NotFound,
    PermissionDenied,
    ValidationError,
)
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
)
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import (
    HasApplicationRole,
    IsAdminRole,
    IsWorkerRole,
    get_linked_worker,
    get_user_role,
)
from accounts.serializers import (
    AccountCreateSerializer,
    AccountProfileSerializer,
    CurrentUserSerializer,
    LoginResponseSerializer,
    LoginSerializer,
    MyExposureProfileSerializer,
    MyWorkerProfileSerializer,
    MyMonitoringSerializer,
)
from devices.models import H2SReading
from alerts.models import Alert
from alerts.serializers import AlertSerializer
from arkl.models import ARKLResult
from arkl.serializers import ARKLResultSerializer
from exposure.models import ExposureProfile, Worker


def build_current_user_data(user):
    """
    Build the authenticated user's public application identity.

    This helper is intentionally presentation-only and does not
    perform authorization decisions.
    """
    role = get_user_role(user)

    profile = getattr(
        user,
        "account_profile",
        None,
    )

    worker = (
        profile.worker
        if profile is not None
        else None
    )

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": role,
        "worker_id": (
            worker.id
            if worker
            else None
        ),
        "worker_code": (
            worker.code
            if worker
            else None
        ),
        "worker_name": (
            worker.name
            if worker
            else None
        ),
    }


class LoginView(APIView):
    permission_classes = [
        AllowAny,
    ]

    @extend_schema(
        request=LoginSerializer,
        responses={
            200: LoginResponseSerializer,
        },
    )
    def post(self, request):
        serializer = LoginSerializer(
            data=request.data,
            context={
                "request": request,
            },
        )

        serializer.is_valid(
            raise_exception=True
        )

        user = serializer.validated_data[
            "user"
        ]

        role = get_user_role(user)

        if role is None:
            return Response(
                {
                    "detail": (
                        "User does not have an "
                        "application role."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        token, _ = Token.objects.get_or_create(
            user=user
        )

        user_data = build_current_user_data(
            user
        )

        response_serializer = (
            LoginResponseSerializer(
                {
                    "token": token.key,
                    "user": user_data,
                }
            )
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    permission_classes = [
        IsAuthenticated,
    ]

    @extend_schema(
        request=None,
        responses={
            204: None,
        },
    )
    def post(self, request):
        Token.objects.filter(
            user=request.user
        ).delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )


class CurrentUserView(APIView):
    permission_classes = [
        IsAuthenticated,
        HasApplicationRole,
    ]

    @extend_schema(
        responses={
            200: CurrentUserSerializer,
        },
    )
    def get(self, request):
        data = build_current_user_data(
            request.user
        )

        serializer = CurrentUserSerializer(
            data
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


class AccountCreateView(APIView):
    permission_classes = [
        IsAuthenticated,
        IsAdminRole,
    ]

    @extend_schema(
        request=AccountCreateSerializer,
        responses={
            201: AccountProfileSerializer,
        },
    )
    def post(self, request):
        serializer = AccountCreateSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        profile = serializer.save()

        response_serializer = (
            AccountProfileSerializer(
                profile
            )
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
        )


class WorkerRequiredMixin:
    def get_worker(self):
        worker = get_linked_worker(
            self.request.user
        )

        if worker is None:
            raise PermissionDenied(
                "Authenticated account is not "
                "linked to a Worker."
            )

        if not worker.is_active:
            raise PermissionDenied(
                "Linked Worker is inactive."
            )

        return worker


class MyProfileView(
    WorkerRequiredMixin,
    APIView,
):
    permission_classes = [
        IsAuthenticated,
        IsWorkerRole,
    ]

    @extend_schema(
        responses={
            200: MyWorkerProfileSerializer,
        },
    )
    def get(self, request):
        worker = self.get_worker()

        serializer = (
            MyWorkerProfileSerializer(
                worker
            )
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        request=MyWorkerProfileSerializer,
        responses={
            200: MyWorkerProfileSerializer,
        },
    )
    def patch(self, request):
        worker = self.get_worker()

        serializer = (
            MyWorkerProfileSerializer(
                worker,
                data=request.data,
                partial=True,
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        serializer.save()

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


class MyExposureView(
    WorkerRequiredMixin,
    APIView,
):
    permission_classes = [
        IsAuthenticated,
        IsWorkerRole,
    ]

    @extend_schema(request=MyExposureProfileSerializer, responses={201: MyExposureProfileSerializer})
    @transaction.atomic
    def post(self, request):
        worker = Worker.objects.select_for_update().get(pk=self.get_worker().pk)
        if ExposureProfile.objects.filter(worker=worker).exists():
            raise ValidationError("Profil pajanan sudah ada. Gunakan perubahan data.")
        serializer = MyExposureProfileSerializer(
            data=request.data, context={"worker": worker, "request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(worker=worker)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def get_profile(self):
        worker = self.get_worker()

        try:
            return (
                ExposureProfile.objects
                .select_related("worker")
                .get(worker=worker)
            )
        except ExposureProfile.DoesNotExist as exc:
            raise NotFound(
                "Exposure profile not found."
            ) from exc

    @extend_schema(
        responses={
            200: MyExposureProfileSerializer,
        },
    )
    def get(self, request):
        profile = self.get_profile()

        serializer = (
            MyExposureProfileSerializer(
                profile
            )
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        request=MyExposureProfileSerializer,
        responses={
            200: MyExposureProfileSerializer,
        },
    )
    @transaction.atomic
    def patch(self, request):
        Worker.objects.select_for_update().get(pk=self.get_worker().pk)
        profile = ExposureProfile.objects.select_for_update().get(pk=self.get_profile().pk)

        serializer = (
            MyExposureProfileSerializer(
                profile,
                data=request.data,
                partial=True,
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        serializer.save()

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


class MyARKLResultListView(
    WorkerRequiredMixin,
    APIView,
):
    permission_classes = [
        IsAuthenticated,
        IsWorkerRole,
    ]

    @extend_schema(
        responses={
            200: ARKLResultSerializer(
                many=True
            ),
        },
    )
    def get(self, request):
        worker = self.get_worker()

        queryset = (
            ARKLResult.objects
            .filter(worker=worker)
            .select_related(
                "worker",
                "reading",
                "reading__device",
                "reference_measurement",
            )
            .order_by(
                "-created_at",
                "-id",
            )
        )

        serializer = ARKLResultSerializer(
            queryset,
            many=True,
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


class MyAlertListView(
    WorkerRequiredMixin,
    APIView,
):
    permission_classes = [
        IsAuthenticated,
        IsWorkerRole,
    ]

    @extend_schema(
        responses={
            200: AlertSerializer(
                many=True
            ),
        },
    )
    def get(self, request):
        worker = self.get_worker()

        queryset = (
            Alert.objects
            .filter(worker=worker)
            .select_related(
                "worker",
                "device",
                "reading",
                "arkl_result",
                "acknowledged_by",
                "resolved_by",
            )
            .order_by(
                "-created_at",
                "-id",
            )
        )

        serializer = AlertSerializer(
            queryset,
            many=True,
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

class MyMonitoringView(
    WorkerRequiredMixin,
    APIView,
):
    permission_classes = [
        IsAuthenticated,
        IsWorkerRole,
    ]

    @extend_schema(
        responses={
            200: MyMonitoringSerializer,
        },
    )
    def get(self, request):
        worker = self.get_worker()

        device = worker.monitoring_device

        if device is None:
            raise NotFound(
                "Monitoring device not assigned."
            )

        reading = (
            H2SReading.objects
            .filter(
                device=device
            )
            .select_related(
                "device"
            )
            .order_by(
                "-received_at",
                "-id",
            )
            .first()
        )

        serializer = (
            MyMonitoringSerializer(
                {
                    "device": device,
                    "reading": reading,
                }
            )
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )
