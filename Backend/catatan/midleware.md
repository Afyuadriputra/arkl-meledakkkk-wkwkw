CATATAN BACKEND:

Project menggunakan Django + DRF + SQLite dengan prinsip SOLID, KISS, dan YAGNI.

Core observability/middleware SUDAH selesai disetup dan sudah diuji dengan unit test + feature test.

Struktur yang sudah tersedia:

core/
├── exceptions.py
├── middleware/
│   ├── performance.py
│   ├── request_id.py
│   ├── request_logging.py
│   └── security_audit.py
├── observability/
│   ├── context.py
│   ├── logging.py
│   └── redaction.py
└── tests/
    ├── test_middleware_feature.py
    ├── test_performance.py
    ├── test_request_id.py
    ├── test_request_logging.py
    └── test_security_audit.py

Middleware sudah terdaftar di settings.py dan berfungsi global untuk HTTP request.

Kemampuan observability yang SUDAH tersedia:

- Request/Trace ID
- Request & response logging
- Exception/error logging
- Performance / slow request monitoring
- Security audit dasar untuk HTTP 400/401/403
- Sensitive data redaction
- Rotating log files
- Unit test dan feature test middleware

ATURAN:

1. Jangan membuat ulang middleware/observability tersebut.
2. Feature HTTP baru otomatis memakai middleware global.
3. Untuk background process seperti MQTT, gunakan logger `smart_h2s.*` secara eksplisit.
4. Jangan log password, token, authorization header, cookie, atau data sensitif mentah.
5. Logic bisnis/scientific tetap diletakkan di service dan diuji dengan unit test.
6. Jangan menambah Sentry/OpenTelemetry/Redis/Celery atau library observability lain kecuali ada kebutuhan teknis nyata.
7. Pertahankan arsitektur:
   View/Serializer → Service → Model/ORM → SQLite.
