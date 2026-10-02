from django.http import HttpResponse
from django.test import RequestFactory

from core.middleware.request_id import RequestIDMiddleware


def test_request_id_is_created():
    factory = RequestFactory()
    request = factory.get("/test/")

    middleware = RequestIDMiddleware(lambda request: HttpResponse("OK"))

    response = middleware(request)

    assert hasattr(request, "request_id")
    assert request.request_id
    assert response["X-Request-ID"] == request.request_id


def test_existing_request_id_is_reused():
    factory = RequestFactory()

    request = factory.get(
        "/test/",
        HTTP_X_REQUEST_ID="existing-request-id",
    )

    middleware = RequestIDMiddleware(lambda request: HttpResponse("OK"))

    response = middleware(request)

    assert request.request_id == "existing-request-id"
    assert response["X-Request-ID"] == "existing-request-id"
