import uuid

from core.observability.context import request_id_ctx


class RequestIDMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        incoming_request_id = request.headers.get("X-Request-ID")

        request_id = incoming_request_id or str(uuid.uuid4())

        request.request_id = request_id

        token = request_id_ctx.set(request_id)

        try:
            response = self.get_response(request)

            response["X-Request-ID"] = request_id

            return response
        finally:
            request_id_ctx.reset(token)
