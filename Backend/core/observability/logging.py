import logging

from core.observability.context import request_id_ctx


class RequestContextFilter(logging.Filter):
    def filter(self, record):
        record.request_id = request_id_ctx.get()
        return True
