You are acting as a Senior Software Architect, Backend Engineer,
Frontend Engineer, IoT Systems Engineer, and Technical Documentation
Engineer.

PROJECT:
Smart H2S Environmental Health Risk Monitoring System

Repository contains:

Backend:
Django + Django REST Framework + MQTT ingestion + deterministic ARKL
risk calculation + Alert Engine + Research API.

Frontend:
React + TypeScript + Vite frontend for Operator, Researcher, and Worker.

TASK:

Create a new technical source-of-truth document:

Backend/catatan/SYSTEM_TECHNICAL_REFERENCE.md

IMPORTANT:
Do NOT write a generic README.
Do NOT redesign the system.
Do NOT refactor production code.
Do NOT modify scientific formulas or constants.
Do NOT infer functionality only from filenames.

Before writing the document, inspect the actual repository implementation.

Read at minimum:

BACKEND

- config/settings.py
- config/urls.py
- accounts/models.py
- accounts/permissions.py
- accounts/serializers.py
- accounts/services.py
- accounts/views.py
- accounts/urls.py
- devices/models.py
- devices/serializers.py
- devices/views.py
- devices/urls.py
- devices/services/mqtt_ingestion.py
- devices/services/telemetry.py
- devices/management/commands/run_mqtt.py
- exposure/models.py
- exposure/serializers.py
- exposure/views.py
- exposure/urls.py
- exposure/services/constants.py
- exposure/services/inhalation.py
- exposure/services/validation.py
- arkl/models.py
- arkl/serializers.py
- arkl/views.py
- arkl/urls.py
- ALL files inside arkl/services/
- alerts/models.py
- alerts/serializers.py
- alerts/views.py
- alerts/urls.py
- ALL files inside alerts/services/
- research/serializers.py
- research/views.py
- research/urls.py
- ALL files inside research/services/
- core/middleware/
- core/observability/
- relevant backend tests
- feature_tests/

FRONTEND

- src/App.tsx
- src/app/navigation.ts
- src/app/router/AppRouter.tsx
- all guards
- all layouts
- all src/api/*.ts
- all pages under:
  src/pages/operational/
  src/pages/worker/
  src/pages/research/
- status/data-display components relevant to domain behavior
- all integration tests under:
  src/tests/integration/

Also inspect existing documentation under:

Backend/catatan/

especially:

- ARKL_CALCULATION_SPEC.md
- FRONTEND_API_CONTRACT.md
- PROJECT_STATUS.md
- SOP_Backend_Smart_H2S.md

Existing documentation is SECONDARY evidence.

Priority of truth:

1. Current production code
2. Current automated tests
3. Current migrations/models
4. Existing documentation
5. Assumptions

If documentation conflicts with code/tests, document the current
implementation and explicitly note the conflict.

==================================================
DOCUMENT PURPOSE
================

SYSTEM_TECHNICAL_REFERENCE.md must allow another engineer or AI coding
agent to understand the current system without reconstructing the whole
architecture from scratch.

Document WHAT exists, HOW it works, WHY important boundaries exist, and
WHERE each responsibility lives.

==================================================
REQUIRED SECTIONS
=================

Create these sections:

1. Project Overview
2. System Objectives
3. Technology Stack

   - Backend
   - Frontend
   - IoT/MQTT
   - Database
   - Testing
4. High-Level Architecture
   Include Mermaid diagrams.
5. Domain / Layer Architecture

   Explain:
   Layer 1 — Environmental IoT Monitoring
   Layer 2 — Exposure Management
   Layer 3 — Smart ARKL
   Layer 4 — Early Warning & Risk Management
   Layer 5 — Research / Reporting
6. User Roles and RBAC

   Document actual roles:
   ADMIN
   OPERATOR
   RESEARCHER
   WORKER

   For each role document actual permissions from the implementation.
7. Backend Module Responsibilities

   Document:

   accounts
   devices
   exposure
   arkl
   alerts
   research
   core
   config

   For each module describe:

   - purpose
   - important models
   - important services
   - important API endpoints
   - dependencies on other modules
8. Frontend Architecture

   Describe:

   - API layer
   - routing
   - layouts
   - guards
   - operational pages
   - worker pages
   - research pages
   - reusable components
9. Feature Matrix

   Produce a table:

   Feature
   User Role
   Frontend Page
   Backend Endpoint
   Backend Service
   Persistence Model
   Status
10. Complete End-to-End Data Flow

   Explain:

   ESP32/Wokwi
   → MQTT broker
   → Django MQTT subscriber
   → validation
   → normalization
   → H2SReading
   → assigned Worker lookup
   → automatic ARKL policy
   → ARKLResult
   → Alert Engine
   → Alert persistence
   → REST API
   → React UI

   Include Mermaid sequence diagram.

11. MQTT and Telemetry Contract

   Document:

- payload
- validation
- status normalization
- persistence
- failure isolation
- reconnect/error behavior where implemented

12. Worker Monitoring Assignment

   Document the actual invariant:

   Worker has zero or one monitoring_device.
   One Device may monitor multiple Workers.

   Worker does not select the monitoring device.

   Explain realtime assignment enforcement.

13. Exposure Management

   Document actual Worker and ExposureProfile fields.

   Explain inhalation methodology and synchronization behavior.

14. ARKL Scientific Calculation

   Document the actual formula pipeline from code.

   Include:
   ppm → mg/m3
   exposure concentration
   intake
   RfC
   RQ
   interpretation

   IMPORTANT:
   Do not change scientific values.

15. Scientific Guardrails

   Clearly state:

   ARKL is environmental health risk characterization.

   ARKL does NOT diagnose ISPA.

   RQ is NOT probability of disease.

   Scientific constants/formulas must not be silently modified.

16. Automatic ARKL Processing Policy

   Recover the exact policy from arkl/services/automatic.py.

   Explain:

- first result
- status change
- periodic processing
- duplicate/stale reading handling
- worker assignment
- transaction/locking behavior
- per-worker failure isolation

17. Realtime vs Historical ARKL

   Explain differences in:

- data source
- assignment enforcement
- persistence
- API behavior

18. Alert Engine

   Recover exact environmental/RQ matrix from code.

   Document:
   NONE
   LOW
   MEDIUM
   HIGH
   CRITICAL

19. Alert Persistence & Deduplication

   Explain:

- active Alert definition
- duplicate behavior
- lower-level behavior
- escalation behavior
- NONE behavior

20. Alert Lifecycle

   Explain:
   OPEN
   ACKNOWLEDGED
   RESOLVED

   Explain who may acknowledge/resolve based on permissions.

21. Recommendation Engine

   List recommendation codes actually implemented.

   Explain deterministic recommendation behavior.

22. Research Module

   Document:

- H2S summary
- H2S trends
- ARKL results
- risk distribution
- exposure summary
- alert summary
- CSV export
- reporting/statistics functionality that actually exists

23. Frontend Operational Behavior

   For every operational page explain:

- purpose
- data source/API
- mutation capability
- polling behavior
- important domain semantics

24. Worker Frontend Behavior

   Clearly distinguish:

   Monitoring H2S
   = current environmental condition

   Risk Saya
   = personal environmental exposure risk characterization

   Peringatan
   = current warning/action state

   Never treat "no active alert" as proof that the environment is safe.

25. Research Frontend Behavior

   Describe current research UI and backend dependencies.

26. Frontend Polling Strategy

   Recover actual refetch intervals from code.

   Explain why the frontend observes backend state instead of triggering
   ARKL calculations during normal IoT operation.

27. API Contract Summary

   Produce tables grouped by:

   Authentication
   Devices
   Workers
   Exposure
   ARKL
   Alerts
   Personal Worker API
   Research

   Include:
   Method
   Path
   Role
   Purpose

28. Error Handling

   Explain:

- validation errors
- missing monitoring device
- missing ExposureProfile
- inactive Worker/device
- MQTT failure isolation
- frontend error states

29. Observability

   Document:
   request ID
   request logging
   performance middleware
   security audit
   structured logging
   redaction

30. Testing Architecture

   Document backend:
   unit tests
   API tests
   feature tests
   MQTT integration tests

   Document frontend integration tests.

31. Integration Fixture Architecture

   Explicitly explain deterministic vs live fixtures.

   Deterministic:

   integration_worker
   → PML-INTEGRATION-001
   → H2S-INTEGRATION-001

   Used by deterministic API/lifecycle integration tests.

   Live:

   integration_live_worker
   → PML-LIVE-001
   → H2S-TPA-001
   → Wokwi/MQTT

   Used by live-iot-flow.integration.test.ts.

   These fixtures MUST remain separated.

32. Current Test Baseline

   Determine baseline from repository/test output or project documentation.
   Do not invent pass counts if they cannot be verified from repository.

33. Current Constraints / Technical Debt

   Only list issues supported by current implementation.

   Examples may include:

- raw telemetry data growth
- SQLite concurrency limitations
- polling rather than WebSocket/SSE
- unsupported inhalation age groups
- frontend bundle size

   But verify them before documenting them.

34. Completed Capabilities
35. Remaining / Planned Capabilities

   Do NOT invent roadmap items.
   Use existing project status/TODOs where available.

36. Rules for Future Development

   Include architectural guardrails such as:

- Keep scientific calculation deterministic.
- Do not use AI/LLM to replace ARKL formulas.
- Persist valid raw telemetry before downstream risk processing.
- Downstream ARKL/Alert failures must not rollback raw telemetry.
- Do not calculate realtime ARKL for every MQTT packet.
- Do not remove Worker monitoring-device ownership checks.
- Do not treat frontend polling as the ARKL trigger.
- Do not let Worker choose arbitrary monitoring devices.
- Do not treat no Alert as proof of safety.
- Keep deterministic integration fixture separate from live MQTT fixture.
- Preserve RBAC.
- Prefer SOLID/KISS/YAGNI.
- Avoid unnecessary infrastructure.

==================================================
DIAGRAMS
========

Use Mermaid for at least:

1. System architecture
2. MQTT → ARKL → Alert data flow
3. Worker monitoring assignment
4. Alert lifecycle
5. Frontend ↔ API ↔ backend domain flow

==================================================
DOCUMENTATION QUALITY RULES
===========================

- Use Indonesian for explanation.
- Keep code identifiers/API names in their original English form.
- Be precise.
- Prefer tables where they improve readability.
- Do not copy huge source-code blocks.
- Reference actual source files using repository-relative paths.
- Clearly label:
  VERIFIED FROM CODE
  VERIFIED FROM TEST
  DOCUMENTATION ONLY
  INFERENCE
  when a statement is not equally certain.
- If a behavior cannot be verified, write:
  "Belum terverifikasi dari implementasi saat ini."
- Do not silently invent missing architecture.
- Do not expose .env secret values.
- Do not modify application code.
- Do not modify tests.
- Only create/update:
  Backend/catatan/SYSTEM_TECHNICAL_REFERENCE.md

==================================================
FINAL VALIDATION
================

Before finishing:

1. Re-read the generated document.
2. Check all endpoint names against urls.py.
3. Check role permissions against implementation.
4. Check scientific constants against code.
5. Check Alert matrix against implementation.
6. Check automatic ARKL policy against automatic.py.
7. Check frontend page names against current repository.
8. Check integration fixture descriptions against tests/seed commands.
9. Remove unsupported assumptions.
10. Confirm no secrets were included.

Finally output a concise summary of:

- what was documented;
- inconsistencies found;
- areas still unverified;
- path of the generated document.
