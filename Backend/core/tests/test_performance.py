import logging
import time

from django.http import HttpResponse
from django.test import RequestFactory, override_settings

from core.middleware.performance import PerformanceMiddleware


def test_response_time_header_exists():
    factory = RequestFactory()
    request = factory.get("/test/")

    middleware = PerformanceMiddleware(lambda request: HttpResponse("OK"))

    response = middleware(request)

    assert "X-Response-Time-ms" in response

    duration = float(response["X-Response-Time-ms"])

    assert duration >= 0


@override_settings(SLOW_REQUEST_THRESHOLD_MS=1)
def test_slow_request_is_logged(caplog):
    factory = RequestFactory()
    request = factory.get("/slow/")

    def slow_view(request):
        time.sleep(0.01)
        return HttpResponse("OK")

    middleware = PerformanceMiddleware(slow_view)

    with caplog.at_level(
        logging.WARNING,
        logger="smart_h2s.performance",
    ):
        response = middleware(request)

    assert response.status_code == 200

    assert any("slow_request" in record.message for record in caplog.records)
