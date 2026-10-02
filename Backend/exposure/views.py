from rest_framework import (
    mixins,
    viewsets,
)
from rest_framework.permissions import (
    IsAuthenticated,
)

from accounts.permissions import (
    IsAdminOrOperator,
)
from exposure.models import (
    ExposureProfile,
    Worker,
)
from exposure.serializers import (
    ExposureProfileSerializer,
    WorkerSerializer,
)


class WorkerViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Worker.objects.all()
    serializer_class = WorkerSerializer

    permission_classes = [
        IsAuthenticated,
        IsAdminOrOperator,
    ]

    http_method_names = [
        "get",
        "post",
        "patch",
        "head",
        "options",
    ]


class ExposureProfileViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = (
        ExposureProfile.objects
        .select_related("worker")
    )

    serializer_class = (
        ExposureProfileSerializer
    )

    permission_classes = [
        IsAuthenticated,
        IsAdminOrOperator,
    ]

    http_method_names = [
        "get",
        "post",
        "patch",
        "head",
        "options",
    ]