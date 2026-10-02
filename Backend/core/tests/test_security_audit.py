import logging

from django.http import HttpResponse
from django.test import RequestFactory

from core.middleware.security_audit import SecurityAuditMiddleware


def test_403_is_logged(caplog):
    factory = RequestFactory()
    request = factory.get("/private/")

    middleware = SecurityAuditMiddleware(lambda request: HttpResponse(status=403))

    with caplog.at_level(
        logging.WARNING,
        logger="smart_h2s.security",
    ):
        response = middleware(request)

    assert response.status_code == 403

    assert any("access_denied" in record.message for record in caplog.records)


def test_400_is_logged(caplog):
    factory = RequestFactory()
    request = factory.post("/invalid/")

    middleware = SecurityAuditMiddleware(lambda request: HttpResponse(status=400))

    with caplog.at_level(
        logging.INFO,
        logger="smart_h2s.security",
    ):
        response = middleware(request)

    assert response.status_code == 400

    assert any("bad_request" in record.message for record in caplog.records)


def test_200_is_not_security_warning(caplog):
    factory = RequestFactory()
    request = factory.get("/public/")

    middleware = SecurityAuditMiddleware(lambda request: HttpResponse(status=200))

    with caplog.at_level(
        logging.WARNING,
        logger="smart_h2s.security",
    ):
        response = middleware(request)

    assert response.status_code == 200

    assert not any("access_denied" in record.message for record in caplog.records)
