from dataclasses import dataclass

from django.db.models import Count

from alerts.models import Alert


@dataclass(frozen=True)
class CountItem:
    value: str
    count: int


@dataclass(frozen=True)
class AlertSummary:
    total_count: int

    simulated_count: int
    physical_count: int

    by_level: list[CountItem]

    by_status: list[CountItem]

    by_risk_status: list[CountItem]

    by_rule_version: list[CountItem]


def _group_count(
    queryset,
    field_name,
):
    rows = (
        queryset.values(field_name)
        .annotate(count=Count("id"))
        .order_by(field_name)
    )

    return [
        CountItem(
            value=row[field_name],
            count=row["count"],
        )
        for row in rows
    ]


def calculate_alert_summary():
    queryset = Alert.objects.all()

    return AlertSummary(
        total_count=queryset.count(),

        simulated_count=queryset.filter(
            source_simulated=True
        ).count(),

        physical_count=queryset.filter(
            source_simulated=False
        ).count(),

        by_level=_group_count(
            queryset,
            "alert_level",
        ),

        by_status=_group_count(
            queryset,
            "status",
        ),

        by_risk_status=_group_count(
            queryset,
            "risk_status",
        ),

        by_rule_version=_group_count(
            queryset,
            "alert_rule_version",
        ),
    )