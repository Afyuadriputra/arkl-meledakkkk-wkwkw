import logging

logger = logging.getLogger("smart_h2s.application")


def log_service_exception(
    service: str,
    exception: Exception,
    **context,
):
    logger.exception(
        "service_error service=%s error_type=%s context=%s",
        service,
        type(exception).__name__,
        context,
    )
