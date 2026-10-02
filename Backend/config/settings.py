import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(
    BASE_DIR / ".env"
)


SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "unsafe-dev-key-change-me",
)


DEBUG = (
    os.getenv(
        "DJANGO_DEBUG",
        "True",
    ).lower()
    == "true"
)


# ============================================================
# NETWORK / LAN ACCESS
# ============================================================
#
# Development only.
#
# Allows Django to accept requests using:
#
# localhost
# 127.0.0.1
# 10.x.x.x
# 192.168.x.x
# 172.x.x.x
#
# and other hosts reaching this machine.
#
# For production, replace "*" with explicit domains.
#
ALLOWED_HOSTS = ["*"]


INSTALLED_APPS = [
    # Django
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third party
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    "drf_spectacular",

    # Project
    "core",
    "devices",
    "exposure",
    "arkl",
    "alerts",
    "research",
    "accounts",
]


MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",

    "core.middleware.request_id.RequestIDMiddleware",
    "core.middleware.request_logging.RequestLoggingMiddleware",
    "core.middleware.performance.PerformanceMiddleware",

    "django.contrib.sessions.middleware.SessionMiddleware",

    # Must stay before CommonMiddleware
    "corsheaders.middleware.CorsMiddleware",

    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",

    "django.contrib.auth.middleware.AuthenticationMiddleware",

    "core.middleware.security_audit.SecurityAuditMiddleware",

    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


ROOT_URLCONF = "config.urls"


TEMPLATES = [
    {
        "BACKEND": (
            "django.template.backends.django.DjangoTemplates"
        ),
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                (
                    "django.template.context_processors."
                    "request"
                ),
                (
                    "django.contrib.auth.context_processors."
                    "auth"
                ),
                (
                    "django.contrib.messages.context_processors."
                    "messages"
                ),
            ],
        },
    },
]


WSGI_APPLICATION = "config.wsgi.application"


DATABASES = {
    "default": {
        "ENGINE": (
            "django.db.backends.sqlite3"
        ),
        "NAME": (
            BASE_DIR / "db.sqlite3"
        ),
    }
}


AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "UserAttributeSimilarityValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "MinimumLengthValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "CommonPasswordValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "NumericPasswordValidator"
        ),
    },
]


LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


STATIC_URL = "static/"

DEFAULT_AUTO_FIELD = (
    "django.db.models.BigAutoField"
)


# ============================================================
# CORS
# ============================================================
#
# Development / local Wi-Fi access.
#
# Allows React/Vite running from any device/origin
# to access the Django REST API.
#
# Do not enable this globally in production.
#
CORS_ALLOW_ALL_ORIGINS = True


REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": (
        "drf_spectacular.openapi.AutoSchema"
    ),

    "DEFAULT_PAGINATION_CLASS": (
        "rest_framework.pagination."
        "PageNumberPagination"
    ),

    "PAGE_SIZE": 50,

    "DEFAULT_AUTHENTICATION_CLASSES": [
        (
            "rest_framework.authentication."
            "TokenAuthentication"
        ),
        (
            "rest_framework.authentication."
            "SessionAuthentication"
        ),
    ],
}


SLOW_REQUEST_THRESHOLD_MS = 500


LOG_DIR = BASE_DIR / "logs"

LOG_DIR.mkdir(
    exist_ok=True
)


LOGGING = {
    "version": 1,

    "disable_existing_loggers": False,

    "filters": {
        "request_context": {
            "()": (
                "core.observability.logging."
                "RequestContextFilter"
            ),
        },
    },

    "formatters": {
        "verbose": {
            "format": (
                "{asctime} "
                "{levelname} "
                "request_id={request_id} "
                "logger={name} "
                "{message}"
            ),
            "style": "{",
        },
    },

    "handlers": {
        "console": {
            "class": (
                "logging.StreamHandler"
            ),
            "formatter": "verbose",
            "filters": [
                "request_context",
            ],
        },

        "application_file": {
            "class": (
                "logging.handlers."
                "RotatingFileHandler"
            ),
            "filename": (
                LOG_DIR / "application.log"
            ),
            "maxBytes": (
                5 * 1024 * 1024
            ),
            "backupCount": 5,
            "formatter": "verbose",
            "filters": [
                "request_context",
            ],
        },

        "error_file": {
            "class": (
                "logging.handlers."
                "RotatingFileHandler"
            ),
            "filename": (
                LOG_DIR / "error.log"
            ),
            "maxBytes": (
                5 * 1024 * 1024
            ),
            "backupCount": 5,
            "level": "ERROR",
            "formatter": "verbose",
            "filters": [
                "request_context",
            ],
        },

        "security_file": {
            "class": (
                "logging.handlers."
                "RotatingFileHandler"
            ),
            "filename": (
                LOG_DIR / "security.log"
            ),
            "maxBytes": (
                5 * 1024 * 1024
            ),
            "backupCount": 5,
            "formatter": "verbose",
            "filters": [
                "request_context",
            ],
        },

        "performance_file": {
            "class": (
                "logging.handlers."
                "RotatingFileHandler"
            ),
            "filename": (
                LOG_DIR / "performance.log"
            ),
            "maxBytes": (
                5 * 1024 * 1024
            ),
            "backupCount": 5,
            "formatter": "verbose",
            "filters": [
                "request_context",
            ],
        },
    },

    "loggers": {
        "smart_h2s": {
            "handlers": [
                "console",
                "application_file",
                "error_file",
            ],
            "level": "INFO",
            "propagate": False,
        },

        "smart_h2s.security": {
            "handlers": [
                "console",
                "security_file",
            ],
            "level": "INFO",
            "propagate": False,
        },

        "smart_h2s.performance": {
            "handlers": [
                "console",
                "performance_file",
            ],
            "level": "WARNING",
            "propagate": False,
        },

        "django.request": {
            "handlers": [
                "console",
                "error_file",
            ],
            "level": "ERROR",
            "propagate": False,
        },
    },
}


# ============================================================
# MQTT
# ============================================================

MQTT_BROKER_HOST = os.getenv(
    "MQTT_BROKER_HOST",
    "broker.hivemq.com",
)


MQTT_BROKER_PORT = int(
    os.getenv(
        "MQTT_BROKER_PORT",
        "1883",
    )
)


MQTT_CLIENT_ID = os.getenv(
    "MQTT_CLIENT_ID",
    "smart-h2s-django-backend",
)


MQTT_TELEMETRY_TOPIC = os.getenv(
    "MQTT_TELEMETRY_TOPIC",
    (
        "afyuadri/h2s-demo/"
        "a7c91f/device-001/"
        "telemetry"
    ),
)