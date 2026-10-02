import logging
import time

from django.conf import settings

logger = logging.getLogger("smart_h2s.performance")


class PerformanceMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

        self.slow_request_ms = getattr(
            settings,
            "SLOW_REQUEST_THRESHOLD_MS",
            500,
        )

    def __call__(self, request):
        started_at = time.perf_counter()

        response = self.get_response(request)

        duration_ms = (time.perf_counter() - started_at) * 1000

        response["X-Response-Time-ms"] = f"{duration_ms:.2f}"

        if duration_ms >= self.slow_request_ms:
            logger.warning(
                "slow_request method=%s path=%s status=%s "
                "duration_ms=%.2f threshold_ms=%s",
                request.method,
                request.path,
                response.status_code,
                duration_ms,
                self.slow_request_ms,
            )

        return response
