from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("exposure", "0003_worker_monitoring_device"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Existing staff/legacy profiles remain eligible; no reviewer is invented.
        migrations.AddField(
            model_name="exposureprofile", name="approval_status",
            field=models.CharField(max_length=12, db_index=True, default="APPROVED",
                choices=[("PENDING", "Menunggu ACC"), ("APPROVED", "Disetujui"),
                         ("REJECTED", "Perlu perbaikan")]),
        ),
        migrations.AddField(
            model_name="exposureprofile", name="review_note",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="exposureprofile", name="reviewed_at",
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name="exposureprofile", name="reviewed_by",
            field=models.ForeignKey(null=True, blank=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="reviewed_exposure_profiles", to=settings.AUTH_USER_MODEL),
        ),
    ]
