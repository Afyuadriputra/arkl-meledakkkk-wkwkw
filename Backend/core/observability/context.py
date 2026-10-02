from contextvars import ContextVar

request_id_ctx = ContextVar("request_id", default="-")
