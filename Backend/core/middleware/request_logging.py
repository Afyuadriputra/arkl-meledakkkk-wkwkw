import logging
import time

logger = logging.getLogger("smart_h2s.request")


class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        started_at = time.perf_counter()

        logger.info(
            "request_started method=%s path=%s ip=%s",
            request.method,
            request.path,
            self._get_client_ip(request),
        )

        try:
            response = self.get_response(request)
        except Exception:
            duration_ms = (time.perf_counter() - started_at) * 1000

            logger.exception(
                "request_failed method=%s path=%s duration_ms=%.2f",
                request.method,
                request.path,
                duration_ms,
            )

            raise

        duration_ms = (time.perf_counter() - started_at) * 1000

        logger.info(
            "request_completed method=%s path=%s status=%s duration_ms=%.2f",
            request.method,
            request.path,
            response.status_code,
            duration_ms,
        )

        return response

    @staticmethod
    def _get_client_ip(request):
        forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")

        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        return request.META.get("REMOTE_ADDR", "-")
