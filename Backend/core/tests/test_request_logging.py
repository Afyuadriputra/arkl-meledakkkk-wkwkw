import logging

from django.http import HttpResponse
from django.test import RequestFactory

from core.middleware.request_logging import RequestLoggingMiddleware


def test_request_logging_success(caplog):
    factory = RequestFactory()
    request = factory.get("/test/")

    middleware = RequestLoggingMiddleware(
        lambda request: HttpResponse("OK", status=200)
    )

    with caplog.at_level(
        logging.INFO,
        logger="smart_h2s.request",
    ):
        response = middleware(request)

    assert response.status_code == 200

    messages = [record.message for record in caplog.records]

    assert any("request_started" in message for message in messages)

    assert any("request_completed" in message for message in messages)


def test_request_logging_exception(caplog):
    factory = RequestFactory()
    request = factory.get("/error/")

    def broken_view(request):
        raise ValueError("Test error")

    middleware = RequestLoggingMiddleware(broken_view)

    with caplog.at_level(
        logging.ERROR,
        logger="smart_h2s.request",
    ):
        try:
            middleware(request)
        except ValueError:
            pass

    assert any("request_failed" in record.message for record in caplog.records)
