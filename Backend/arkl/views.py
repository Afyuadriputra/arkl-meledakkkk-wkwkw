from drf_spectacular.utils import (
    extend_schema,
)
from rest_framework import status
from rest_framework.generics import (
    ListAPIView,
    RetrieveAPIView,
    ListCreateAPIView,
    RetrieveUpdateAPIView,
)
from rest_framework.permissions import (
    IsAuthenticated,
)
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import (
    IsAdminOperatorOrResearcher,
    IsAdminOrOperator,
    OperationalOrReadOnlyResearcher,
)
from alerts.serializers import (
    AlertEvaluationResponseSerializer,
)
from arkl.models import ARKLResult, ReferenceMeasurement
from arkl.serializers import (
    ARKLResultSerializer,
    HistoricalARKLRequestSerializer,
    RealtimeARKLRequestSerializer,
    RealtimeARKLResponseSerializer,
    ReferenceMeasurementSerializer,
    ReferenceARKLRequestSerializer,
)
from arkl.services.calculator import (
    ARKLCalculationError,
    calculate_historical_risk,
)
from arkl.services.realtime import (
    RealtimeARKLError,
    run_realtime_arkl,
)


ARKL_RESULT_QUERYSET = (
    ARKLResult.objects
    .select_related(
        "worker",
        "reading",
        "reading__device",
        "reference_measurement",
    )
)


class RealtimeARKLView(APIView):
    permission_classes = [
        IsAuthenticated,
        IsAdminOrOperator,
    ]

    @extend_schema(
        request=(
            RealtimeARKLRequestSerializer
        ),
        responses={
            201: (
                RealtimeARKLResponseSerializer
            ),
        },
        tags=[
            "ARKL",
        ],
        summary=(
            "Calculate realtime ARKL risk "
            "and evaluate alert"
        ),
    )
    def post(
        self,
        request,
    ):
        serializer = (
            RealtimeARKLRequestSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            result = (
                run_realtime_arkl(
                    worker=(
                        serializer
                        .validated_data[
                            "worker"
                        ]
                    ),
                    device=(
                        serializer
                        .validated_data[
                            "device"
                        ]
                    ),
                )
            )
        except RealtimeARKLError as exc:
            return Response(
                {
                    "detail": str(exc),
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )


        response_data = {
            "arkl_result": (
                ARKLResultSerializer(
                    result.arkl_result
                ).data
            ),
            "alert_evaluation": (
                AlertEvaluationResponseSerializer(
                    result.alert_evaluation
                ).data
            ),
        }


        return Response(
            response_data,
            status=(
                status.HTTP_201_CREATED
            ),
        )


class HistoricalARKLView(APIView):
    permission_classes = [
        IsAuthenticated,
        IsAdminOrOperator,
    ]

    @extend_schema(
        request=(
            HistoricalARKLRequestSerializer
        ),
        responses={
            201: ARKLResultSerializer,
        },
        tags=[
            "ARKL",
        ],
        summary=(
            "Calculate historical ARKL risk"
        ),
    )
    def post(
        self,
        request,
    ):
        serializer = (
            HistoricalARKLRequestSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            result = (
                calculate_historical_risk(
                    worker=(
                        serializer
                        .validated_data[
                            "worker"
                        ]
                    ),
                    device=(
                        serializer
                        .validated_data[
                            "device"
                        ]
                    ),
                    period_start=(
                        serializer
                        .validated_data[
                            "start_time"
                        ]
                    ),
                    period_end=(
                        serializer
                        .validated_data[
                            "end_time"
                        ]
                    ),
                )
            )
        except ARKLCalculationError as exc:
            return Response(
                {
                    "detail": str(exc),
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        return Response(
            ARKLResultSerializer(
                result
            ).data,
            status=(
                status.HTTP_201_CREATED
            ),
        )


@extend_schema(
    tags=[
        "ARKL",
    ],
    summary=(
        "List ARKL results"
    ),
)
class ARKLResultListView(
    ListAPIView
):
    serializer_class = (
        ARKLResultSerializer
    )

    permission_classes = [
        IsAuthenticated,
        IsAdminOperatorOrResearcher,
    ]

    def get_queryset(self):
        queryset = (
            ARKL_RESULT_QUERYSET
            .all()
        )

        worker_code = (
            self.request
            .query_params
            .get(
                "worker_code"
            )
        )

        calculation_type = (
            self.request
            .query_params
            .get(
                "calculation_type"
            )
        )

        if worker_code:
            queryset = (
                queryset.filter(
                    worker__code=(
                        worker_code
                    )
                )
            )

        if calculation_type:
            queryset = (
                queryset.filter(
                    calculation_type=(
                        calculation_type
                    )
                )
            )

        if calculation_type == "REFERENCE":
            queryset = queryset.order_by("-reference_measurement__measured_at", "-created_at", "-id")

        return queryset


@extend_schema(
    tags=[
        "ARKL",
    ],
    summary=(
        "Retrieve ARKL result"
    ),
)
class ARKLResultDetailView(
    RetrieveAPIView
):
    queryset = (
        ARKL_RESULT_QUERYSET.all()
    )

    serializer_class = (
        ARKLResultSerializer
    )

    permission_classes = [
        IsAuthenticated,
        IsAdminOperatorOrResearcher,
    ]


class ReferenceMeasurementListView(ListCreateAPIView):
    queryset = ReferenceMeasurement.objects.all()
    serializer_class = ReferenceMeasurementSerializer
    permission_classes = [IsAuthenticated, OperationalOrReadOnlyResearcher]

    def perform_create(self, serializer):
        from arkl.services.reference import calculate_reference_risk
        measurement = serializer.save(created_by=self.request.user)
        for worker in measurement.workers.all():
            try:
                calculate_reference_risk(worker=worker, measurement=measurement)
            except ARKLCalculationError:
                # Retain the measurement/assignment; missing profiles can follow.
                continue


class ReferenceMeasurementDetailView(RetrieveUpdateAPIView):
    queryset = ReferenceMeasurement.objects.all()
    serializer_class = ReferenceMeasurementSerializer
    permission_classes = [IsAuthenticated, OperationalOrReadOnlyResearcher]


class ReferenceARKLView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrOperator]

    @extend_schema(request=ReferenceARKLRequestSerializer, responses={201: ARKLResultSerializer}, tags=["ARKL"])
    def post(self, request):
        from arkl.services.reference import calculate_reference_risk
        serializer = ReferenceARKLRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = calculate_reference_risk(**serializer.validated_data)
        except ARKLCalculationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ARKLResultSerializer(result).data, status=status.HTTP_201_CREATED)
