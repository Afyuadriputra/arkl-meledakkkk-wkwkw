from django.contrib import admin

from .models import Device, H2SReading


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = (
        "device_code",
        "name",
        "location",
        "is_active",
        "created_at",
    )

    search_fields = (
        "device_code",
        "name",
        "location",
    )

    list_filter = ("is_active",)


@admin.register(H2SReading)
class H2SReadingAdmin(admin.ModelAdmin):
    list_display = (
        "device",
        "ppm",
        "adc",
        "filtered_adc",
        "level",
        "status",
        "simulated",
        "received_at",
    )

    search_fields = (
        "device__device_code",
        "status",
    )

    list_filter = (
        "simulated",
        "status",
        "level",
    )

    readonly_fields = ("received_at",)
