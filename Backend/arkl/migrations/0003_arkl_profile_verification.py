from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("arkl", "0002_arklresult_exposure_concentration_mg_m3_and_more")]
    operations = [
        migrations.AddField(
            model_name="arklresult", name="exposure_profile_verified",
            field=models.BooleanField(null=True, default=None,
                help_text="Status verifikasi profil saat hasil dihitung; null untuk riwayat lama."),
        ),
    ]
