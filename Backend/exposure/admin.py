from django.contrib import admin
from django import forms
from django.utils import timezone
from exposure.serializers import ExposureProfileSerializer
from rest_framework.exceptions import ValidationError
from exposure.services.inhalation import (
    resolve_inhalation_methodology, sync_worker_exposure_inhalation_rate,
    UnsupportedInhalationMethodologyError,
)

from exposure.models import (
    ExposureProfile,
    Worker,
)


class WorkerAdminForm(forms.ModelForm):
    class Meta:
        model = Worker
        fields = "__all__"

    def clean_age(self):
        age = self.cleaned_data.get("age")
        if self.instance.pk and ExposureProfile.objects.filter(worker=self.instance).exists():
            try:
                resolve_inhalation_methodology(age)
            except UnsupportedInhalationMethodologyError as exc:
                raise forms.ValidationError(str(exc)) from exc
        return age


@admin.register(Worker)
class WorkerAdmin(admin.ModelAdmin):
    form = WorkerAdminForm
    list_display = (
        "code",
        "name",
        "age",
        "is_active",
        "created_at",
        "updated_at",
    )

    search_fields = (
        "code",
        "name",
    )

    list_filter = (
        "is_active",
    )

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if change and "age" in form.changed_data:
            sync_worker_exposure_inhalation_rate(obj)
            ExposureProfile.objects.filter(worker=obj).update(
                approval_status=ExposureProfile.ApprovalStatus.PENDING,
                reviewed_by=None, reviewed_at=None, review_note="",
            )
        if "age" in form.changed_data or "monitoring_device" in form.changed_data:
            from arkl.services.profile_refresh import refresh_worker_realtime_risk
            refresh_worker_realtime_risk(obj)


class ExposureProfileAdminForm(forms.ModelForm):
    class Meta:
        model = ExposureProfile
        exclude = ("inhalation_rate", "reviewed_by", "reviewed_at")

    def clean(self):
        data = super().clean()
        if self.errors:
            return data
        serializer = ExposureProfileSerializer(
            instance=self.instance if self.instance.pk else None,
            data={key: (value.pk if key == "worker" else value)
                  for key, value in data.items() if key in (
                      "worker", "body_weight", "exposure_time", "exposure_frequency",
                      "exposure_duration", "approval_status", "review_note")},
        )
        try:
            serializer.is_valid(raise_exception=True)
            self.instance.inhalation_rate = float(
                serializer._resolve_methodology(data["worker"]).inhalation_rate
            )
        except ValidationError as exc:
            raise forms.ValidationError(str(exc.detail)) from exc
        return data


@admin.register(ExposureProfile)
class ExposureProfileAdmin(
    admin.ModelAdmin
):
    form = ExposureProfileAdminForm
    list_display = (
        "worker",
        "body_weight",
        "exposure_time",
        "exposure_frequency",
        "exposure_duration",
        "inhalation_rate",
        "approval_status",
        "reviewed_at",
        "updated_at",
    )

    search_fields = (
        "worker__code",
        "worker__name",
    )

    list_filter = ("approval_status",)
    readonly_fields = ("reviewed_by", "reviewed_at", "inhalation_rate")

    def save_model(self, request, obj, form, change):
        if form.changed_data or not change:
            pending = obj.approval_status == ExposureProfile.ApprovalStatus.PENDING
            obj.reviewed_by = None if pending else request.user
            obj.reviewed_at = None if pending else timezone.now()
        super().save_model(request, obj, form, change)
        from arkl.services.profile_refresh import refresh_worker_realtime_risk
        refresh_worker_realtime_risk(obj.worker)
