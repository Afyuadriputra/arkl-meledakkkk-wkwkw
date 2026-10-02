import logging

logger = logging.getLogger("smart_h2s.security")


class SecurityAuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if response.status_code in {401, 403}:
            logger.warning(
                "access_denied method=%s path=%s status=%s ip=%s user=%s",
                request.method,
                request.path,
                response.status_code,
                self._get_client_ip(request),
                self._get_user_identifier(request),
            )

        elif response.status_code == 400:
            logger.info(
                "bad_request method=%s path=%s ip=%s",
                request.method,
                request.path,
                self._get_client_ip(request),
            )

        return response

    @staticmethod
    def _get_client_ip(request):
        forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")

        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        return request.META.get("REMOTE_ADDR", "-")

    @staticmethod
    def _get_user_identifier(request):
        user = getattr(request, "user", None)

        if user and user.is_authenticated:
            return str(user.pk)

        return "anonymous"
