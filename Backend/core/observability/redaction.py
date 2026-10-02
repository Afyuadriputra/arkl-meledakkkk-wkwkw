SENSITIVE_KEYS = {
    "password",
    "token",
    "access_token",
    "refresh_token",
    "authorization",
    "cookie",
    "secret",
    "api_key",
}


def redact_mapping(data: dict) -> dict:
    if not isinstance(data, dict):
        return {}

    sanitized = {}

    for key, value in data.items():
        if key.lower() in SENSITIVE_KEYS:
            sanitized[key] = "[REDACTED]"
        elif isinstance(value, dict):
            sanitized[key] = redact_mapping(value)
        else:
            sanitized[key] = value

    return sanitized
