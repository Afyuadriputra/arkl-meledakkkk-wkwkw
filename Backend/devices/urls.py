from rest_framework.routers import SimpleRouter

from devices.views import (
    DeviceViewSet,
    H2SReadingViewSet,
)

router = SimpleRouter()

router.register(
    "devices",
    DeviceViewSet,
    basename="device",
)

router.register(
    "readings",
    H2SReadingViewSet,
    basename="reading",
)

urlpatterns = router.urls
