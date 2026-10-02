from django.contrib import admin

from arkl.models import ARKLResult, ReferenceMeasurement


@admin.register(ARKLResult)
class ARKLResultAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "worker",
        "calculation_type",
        "concentration_ppm",
        "rq",
        "interpretation",
        "source_simulated",
        "calculation_version",
        "created_at",
    )

    list_filter = (
        "calculation_type",
        "interpretation",
        "source_simulated",
        "calculation_version",
    )

    search_fields = (
        "worker__code",
        "reading__device__device_code",
    )

    readonly_fields = tuple(field.name for field in ARKLResult._meta.fields)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ReferenceMeasurement)
class ReferenceMeasurementAdmin(admin.ModelAdmin):
    list_display = ("id", "concentration_ppm", "measured_at", "location", "source", "created_at")
    readonly_fields = ("created_by", "created_at")
    search_fields = ("location", "source")
    filter_horizontal = ("workers",)

    def has_change_permission(self, request, obj=None):
        if obj and obj.arkl_results.exists():
            return False
        return super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        return False

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def save_related(self, request, form, formsets, change):
        from arkl.services.reference import calculate_reference_risk
        from arkl.services.calculator import ARKLCalculationError
        super().save_related(request, form, formsets, change)
        for worker in form.instance.workers.all():
            try:
                calculate_reference_risk(worker=worker, measurement=form.instance)
            except ARKLCalculationError:
                continue
