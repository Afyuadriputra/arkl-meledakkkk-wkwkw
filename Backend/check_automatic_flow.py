import os

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "config.settings",
)

import django

django.setup()

from alerts.models import Alert
from arkl.models import ARKLResult
from devices.models import H2SReading
from exposure.models import Worker


DEVICE_CODE = "H2S-TPA-001"


def main():
    reading = (
        H2SReading.objects
        .filter(
            device__device_code=DEVICE_CODE
        )
        .select_related("device")
        .order_by(
            "-received_at",
            "-id",
        )
        .first()
    )

    if reading is None:
        print("Tidak ada reading.")
        return

    print("\n=== LATEST MQTT READING ===")
    print(f"Reading ID : {reading.id}")
    print(f"Device     : {reading.device.device_code}")
    print(f"PPM        : {reading.ppm}")
    print(f"Status     : {reading.status}")
    print(f"Received   : {reading.received_at}")
    print(f"Simulated  : {reading.simulated}")

    workers = (
        Worker.objects
        .filter(
            monitoring_device=reading.device,
            is_active=True,
        )
        .order_by("id")
    )

    print("\n=== ASSIGNED WORKERS ===")

    if not workers.exists():
        print("Tidak ada worker aktif yang assigned.")
        return

    for worker in workers:
        print(
            f"\nWorker: {worker.code} - {worker.name}"
        )

        latest_arkl = (
            ARKLResult.objects
            .filter(
                worker=worker,
                calculation_type=(
                    ARKLResult
                    .CalculationType
                    .REALTIME
                ),
            )
            .select_related("reading")
            .order_by(
                "-id"
            )
            .first()
        )

        if latest_arkl is None:
            print("  ARKL       : belum ada")
        else:
            print(
                f"  ARKL ID    : {latest_arkl.id}"
            )
            print(
                f"  Reading ID : {latest_arkl.reading_id}"
            )
            print(
                f"  PPM        : {latest_arkl.concentration_ppm}"
            )
            print(
                f"  RQ         : {latest_arkl.rq}"
            )
            print(
                f"  Interpret  : {latest_arkl.interpretation}"
            )

            if (
                latest_arkl.reading_id
                == reading.id
            ):
                print(
                    "  Exact read : YES"
                )
            else:
                print(
                    "  Exact read : NO / throttled"
                )

        latest_alert = (
            Alert.objects
            .filter(
                worker=worker
            )
            .order_by(
                "-id"
            )
            .first()
        )

        if latest_alert is None:
            print(
                "  Alert      : tidak ada"
            )
        else:
            print(
                f"  Alert ID   : {latest_alert.id}"
            )
            print(
                f"  Level      : {latest_alert.alert_level}"
            )
            print(
                f"  Lifecycle  : {latest_alert.status}"
            )
            print(
                f"  Reading ID : {latest_alert.reading_id}"
            )

    print("\n=== RESULT ===")
    print(
        "Jika MQTT reading terus bertambah tetapi "
        "ARKL ID tetap selama <60 detik dan status "
        "tidak berubah, throttle bekerja."
    )
    print(
        "Jika status berubah, ARKL baru seharusnya "
        "muncul segera."
    )


if __name__ == "__main__":
    main()