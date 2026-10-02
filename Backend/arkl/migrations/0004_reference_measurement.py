from django.conf import settings
from django.db import migrations, models
import django.core.validators
import django.db.models.deletion
from decimal import Decimal


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("arkl", "0003_arkl_profile_verification"),
        ("exposure", "0004_exposure_approval"),
    ]
    operations = [
        migrations.CreateModel(
            name="ReferenceMeasurement",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "concentration_ppm",
                    models.DecimalField(
                        max_digits=14,
                        decimal_places=6,
                        validators=[
                            django.core.validators.MinValueValidator(Decimal("0"))
                        ],
                    ),
                ),
                ("measured_at", models.DateTimeField(db_index=True)),
                ("location", models.CharField(max_length=255, blank=True, default="")),
                ("source", models.CharField(max_length=255)),
                ("notes", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "workers",
                    models.ManyToManyField(
                        to="exposure.worker",
                        blank=True,
                        related_name="reference_measurements",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        to=settings.AUTH_USER_MODEL,
                        on_delete=django.db.models.deletion.SET_NULL,
                        null=True,
                        blank=True,
                        related_name="reference_measurements",
                    ),
                ),
            ],
            options={"ordering": ["-measured_at", "-id"]},
        ),
        migrations.AddField(
            model_name="arklresult",
            name="reference_measurement",
            field=models.ForeignKey(
                to="arkl.referencemeasurement",
                on_delete=django.db.models.deletion.PROTECT,
                null=True,
                blank=True,
                related_name="arkl_results",
            ),
        ),
        migrations.AlterField(
            model_name="arklresult",
            name="calculation_type",
            field=models.CharField(
                max_length=20,
                choices=[
                    ("REALTIME", "Realtime"),
                    ("HISTORICAL", "Historical"),
                    ("REFERENCE", "Sensor referensi"),
                ],
            ),
        ),
    ]
