from rest_framework.routers import SimpleRouter

from exposure.views import (
    ExposureProfileViewSet,
    WorkerViewSet,
)

router = SimpleRouter()

router.register(
    "workers",
    WorkerViewSet,
    basename="worker",
)

router.register(
    "exposure-profiles",
    ExposureProfileViewSet,
    basename="exposure-profile",
)

urlpatterns = router.urls
