from rest_framework import serializers

from arkl.models import ARKLResult
from arkl.services.constants import (
    ARKL_CALCULATION_VERSION,
)
from research.services.filters import (
    build_research_filters,
)
from research.services.h2s_trends import (
    TrendInterval,
)


class ResearchFilterSerializer(
    serializers.Serializer
):
    start = serializers.DateTimeField(
        required=False,
    )

    end = serializers.DateTimeField(
        required=False,
    )

    device_code = serializers.CharField(
        required=False,
        allow_blank=False,
    )

    # IMPORTANT:
    #
    # QueryDict + DRF BooleanField dapat memperlakukan
    # field boolean yang tidak dikirim sebagai False.
    #
    # default=None mempertahankan contract tri-state:
    #
    # None  -> semua source
    # True  -> simulated
    # False -> physical
    source_simulated = serializers.BooleanField(
        required=False,
        allow_null=True,
        default=None,
    )

    def validate(self, attrs):
        start = attrs.get("start")
        end = attrs.get("end")

        if (
            start is not None
            and end is not None
            and start > end
        ):
            raise serializers.ValidationError(
                {
                    "end": (
                        "end must be greater than "
                        "or equal to start."
                    )
                }
            )

        return attrs

    def to_filters(self):
        if not hasattr(
            self,
            "validated_data",
        ):
            raise AssertionError(
                "is_valid() must be called first."
            )

        return build_research_filters(
            start=self.validated_data.get(
                "start"
            ),
            end=self.validated_data.get(
                "end"
            ),
            device_code=self.validated_data.get(
                "device_code"
            ),
            source_simulated=(
                self.validated_data.get(
                    "source_simulated"
                )
            ),
        )


class H2STrendQuerySerializer(
    ResearchFilterSerializer
):
    interval = serializers.ChoiceField(
        choices=[
            TrendInterval.RAW,
            TrendInterval.HOUR,
            TrendInterval.DAY,
        ],
        default=TrendInterval.DAY,
        required=False,
    )


class H2SSummarySerializer(
    serializers.Serializer
):
    sample_count = serializers.IntegerField()

    minimum_ppm = serializers.FloatField(
        allow_null=True
    )

    maximum_ppm = serializers.FloatField(
        allow_null=True
    )

    average_ppm = serializers.FloatField(
        allow_null=True
    )

    first_reading_at = serializers.DateTimeField(
        allow_null=True
    )

    last_reading_at = serializers.DateTimeField(
        allow_null=True
    )

    simulated_count = serializers.IntegerField()
    physical_count = serializers.IntegerField()
    device_count = serializers.IntegerField()


class RawTrendPointSerializer(
    serializers.Serializer
):
    timestamp = serializers.DateTimeField()
    ppm = serializers.FloatField()
    device_code = serializers.CharField()
    simulated = serializers.BooleanField()


class AggregatedTrendPointSerializer(
    serializers.Serializer
):
    timestamp = serializers.DateTimeField()
    average_ppm = serializers.FloatField()
    minimum_ppm = serializers.FloatField()
    maximum_ppm = serializers.FloatField()
    sample_count = serializers.IntegerField()


class H2STrendResponseSerializer(
    serializers.Serializer
):
    interval = serializers.ChoiceField(
        choices=[
            TrendInterval.RAW,
            TrendInterval.HOUR,
            TrendInterval.DAY,
        ]
    )

    series = serializers.ListField()


# ============================================================
# ARKL RESEARCH
# ============================================================


class ARKLResearchQuerySerializer(
    serializers.Serializer
):
    """
    Research filter specifically for ARKL results.

    The default calculation_version is always the currently
    active ARKL runtime version.

    This prevents old and new ARKL methodologies from being
    silently aggregated together.
    """

    calculation_version = serializers.CharField(
        required=False,
        default=ARKL_CALCULATION_VERSION,
    )

    worker_code = serializers.CharField(
        required=False,
        allow_blank=False,
    )

    calculation_type = serializers.ChoiceField(
        choices=[
            ARKLResult.CalculationType.REALTIME,
            ARKLResult.CalculationType.HISTORICAL,
        ],
        required=False,
    )

    source_simulated = serializers.BooleanField(
        required=False,
        allow_null=True,
        default=None,
    )

    start = serializers.DateTimeField(
        required=False,
    )

    end = serializers.DateTimeField(
        required=False,
    )

    def validate(self, attrs):
        start = attrs.get("start")
        end = attrs.get("end")

        if (
            start is not None
            and end is not None
            and start > end
        ):
            raise serializers.ValidationError(
                {
                    "end": (
                        "end must be greater than "
                        "or equal to start."
                    )
                }
            )

        version = attrs[
            "calculation_version"
        ].strip()

        if not version:
            raise serializers.ValidationError(
                {
                    "calculation_version": (
                        "calculation_version "
                        "cannot be blank."
                    )
                }
            )

        attrs["calculation_version"] = version

        worker_code = attrs.get(
            "worker_code"
        )

        if worker_code:
            attrs["worker_code"] = (
                worker_code.strip()
            )

        return attrs


class ARKLResearchResultSerializer(
    serializers.Serializer
):
    id = serializers.IntegerField()

    worker_code = serializers.CharField()

    calculation_type = serializers.CharField()

    concentration_ppm = serializers.DecimalField(
        max_digits=14,
        decimal_places=6,
    )

    concentration_mg_m3 = (
        serializers.DecimalField(
            max_digits=14,
            decimal_places=6,
        )
    )

    exposure_concentration_mg_m3 = (
        serializers.DecimalField(
            max_digits=14,
            decimal_places=6,
            allow_null=True,
        )
    )

    averaging_time = serializers.DecimalField(
        max_digits=14,
        decimal_places=4,
        allow_null=True,
    )

    intake = serializers.DecimalField(
        max_digits=24,
        decimal_places=12,
        allow_null=True,
    )

    rfc = serializers.DecimalField(
        max_digits=14,
        decimal_places=8,
    )

    rq = serializers.DecimalField(
        max_digits=24,
        decimal_places=12,
    )

    interpretation = serializers.CharField()

    calculation_version = serializers.CharField()

    source_simulated = serializers.BooleanField()

    reading_id = serializers.IntegerField(
        allow_null=True,
    )

    period_start = serializers.DateTimeField(
        allow_null=True,
    )

    period_end = serializers.DateTimeField(
        allow_null=True,
    )

    reading_count = serializers.IntegerField(
        allow_null=True,
    )

    created_at = serializers.DateTimeField()


class ARKLResearchResponseSerializer(
    serializers.Serializer
):
    calculation_version = serializers.CharField()

    count = serializers.IntegerField()

    results = ARKLResearchResultSerializer(
        many=True,
    )

class RiskDistributionQuerySerializer(
    serializers.Serializer
):
    calculation_version = serializers.CharField(
        required=False,
        default=ARKL_CALCULATION_VERSION,
    )

    worker_code = serializers.CharField(
        required=False,
        allow_blank=False,
    )

    source_simulated = serializers.BooleanField(
        required=False,
        allow_null=True,
        default=None,
    )


class RiskDistributionItemSerializer(
    serializers.Serializer
):
    interpretation = serializers.CharField()
    count = serializers.IntegerField()
    percentage = serializers.FloatField()


class RiskDistributionSerializer(
    serializers.Serializer
):
    calculation_version = serializers.CharField()
    total_count = serializers.IntegerField()

    distribution = (
        RiskDistributionItemSerializer(
            many=True
        )
    )


class ExposureSummarySerializer(
    serializers.Serializer
):
    worker_count = serializers.IntegerField()

    average_body_weight = (
        serializers.FloatField(
            allow_null=True
        )
    )

    average_exposure_time = (
        serializers.FloatField(
            allow_null=True
        )
    )

    average_exposure_frequency = (
        serializers.FloatField(
            allow_null=True
        )
    )

    average_exposure_duration = (
        serializers.FloatField(
            allow_null=True
        )
    )

    average_inhalation_rate = (
        serializers.FloatField(
            allow_null=True
        )
    )


class CountItemSerializer(
    serializers.Serializer
):
    value = serializers.CharField()
    count = serializers.IntegerField()


class AlertSummarySerializer(
    serializers.Serializer
):
    total_count = serializers.IntegerField()

    simulated_count = serializers.IntegerField()
    physical_count = serializers.IntegerField()

    by_level = CountItemSerializer(
        many=True
    )

    by_status = CountItemSerializer(
        many=True
    )

    by_risk_status = CountItemSerializer(
        many=True
    )

    by_rule_version = CountItemSerializer(
        many=True
    )