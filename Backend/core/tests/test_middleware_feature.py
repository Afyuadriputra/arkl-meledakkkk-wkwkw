import logging

import pytest
from django.http import HttpResponse
from django.test import Client
from django.urls import path


def middleware_test_view(request):
    return HttpResponse("OK")


urlpatterns = [
    path(
        "__test__/middleware/",
        middleware_test_view,
    ),
]


@pytest.fixture(autouse=True)
def use_test_urlconf(settings):
    settings.ROOT_URLCONF = __name__


@pytest.mark.django_db
def test_middleware_stack_returns_request_id():
    client = Client()

    response = client.get("/__test__/middleware/")

    assert response.status_code == 200
    assert response["X-Request-ID"]


@pytest.mark.django_db
def test_custom_request_id_survives_full_stack():
    client = Client()

    response = client.get(
        "/__test__/middleware/",
        HTTP_X_REQUEST_ID="feature-test-001",
    )

    assert response.status_code == 200
    assert response["X-Request-ID"] == "feature-test-001"


@pytest.mark.django_db
def test_request_is_logged_through_full_stack(
    caplog,
):
    client = Client()

    with caplog.at_level(
        logging.INFO,
        logger="smart_h2s.request",
    ):
        response = client.get("/__test__/middleware/")

    assert response.status_code == 200

    messages = [record.message for record in caplog.records]

    assert any("request_started" in message for message in messages)

    assert any("request_completed" in message for message in messages)


@pytest.mark.django_db
def test_request_id_is_present_in_log(
    caplog,
):
    client = Client()

    with caplog.at_level(
        logging.INFO,
        logger="smart_h2s.request",
    ):
        response = client.get(
            "/__test__/middleware/",
            HTTP_X_REQUEST_ID="trace-feature-001",
        )

    assert response.status_code == 200

    matching_records = [
        record
        for record in caplog.records
        if getattr(
            record,
            "request_id",
            None,
        )
        == "trace-feature-001"
    ]

    assert matching_records
