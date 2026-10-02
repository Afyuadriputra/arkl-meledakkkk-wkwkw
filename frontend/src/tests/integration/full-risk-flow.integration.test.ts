import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest"

import {
  getCurrentUser,
  login,
  logout,
} from "@/api/auth"

import {
  calculateRealtimeARKL,
} from "@/api/arkl"

import {
  getDevices,
  getLatestReading,
} from "@/api/monitoring"

import {
  clearStoredToken,
} from "@/api/tokenStorage"

import {
  getMyAlerts,
  getMyARKLResults,
  getMyProfile,
} from "@/api/worker"

import {
  integrationDevices,
  integrationUsers,
} from "./env"


const INTEGRATION_DEVICE_CODE =
  integrationDevices.deterministic


describe(
  "FULL FE ↔ BE explicit realtime risk flow",
  () => {
    afterEach(async () => {
      try {
        await logout()
      } catch {
        clearStoredToken()
      }
    })


    it(
      (
        "Operator realtime ARKL → " +
        "Alert → Worker result"
      ),
      async () => {
        const operatorLogin =
          await login(
            integrationUsers.operator,
          )

        expect(
          operatorLogin.user.role,
        ).toBe("OPERATOR")

        expect(
          operatorLogin.token,
        ).toBeTruthy()

        const operatorMe =
          await getCurrentUser()

        expect(
          operatorMe.role,
        ).toBe("OPERATOR")


        /*
         * Deterministic integration device.
         * This device is not the Wokwi live device.
         */
        const devices =
          await getDevices()

        const device =
          devices.results.find(
            (item) =>
              item.device_code ===
              INTEGRATION_DEVICE_CODE,
          )

        if (!device) {
          throw new Error(
            (
              "Deterministic integration " +
              `device ${INTEGRATION_DEVICE_CODE} ` +
              "was not found."
            ),
          )
        }

        if (!device.is_active) {
          throw new Error(
            (
              "Deterministic integration " +
              `device ${INTEGRATION_DEVICE_CODE} ` +
              "must be active."
            ),
          )
        }


        const reading =
          await getLatestReading({
            device_code:
              INTEGRATION_DEVICE_CODE,
          })

        expect(
          reading.device,
        ).toBe(device.id)

        expect(
          reading.device_code,
        ).toBe(
          INTEGRATION_DEVICE_CODE,
        )

        expect(
          reading.ppm,
        ).toBeCloseTo(
          25.4,
          3,
        )

        expect(
          reading.status,
        ).toBe("WARNING")

        expect(
          reading.simulated,
        ).toBe(true)


        /*
         * Discover deterministic integration Worker.
         */
        await logout()

        const workerLogin =
          await login(
            integrationUsers.worker,
          )

        expect(
          workerLogin.user.role,
        ).toBe("WORKER")

        const workerId =
          workerLogin.user.worker_id

        if (
          workerId === null
        ) {
          throw new Error(
            "Integration Worker is not linked.",
          )
        }

        const workerProfile =
          await getMyProfile()

        expect(
          workerProfile.id,
        ).toBe(workerId)

        expect(
          workerProfile.is_active,
        ).toBe(true)


        /*
         * Explicit API compatibility/debug flow.
         *
         * Normal IoT operation is tested separately
         * by live-iot-flow.integration.test.ts.
         */
        await logout()

        await login(
          integrationUsers.operator,
        )

        const response =
          await calculateRealtimeARKL({
            worker: workerId,
            device: device.id,
          })

        const arkl =
          response.arkl_result

        const evaluation =
          response.alert_evaluation


        expect(
          arkl.worker,
        ).toBe(workerId)

        expect(
          arkl.worker_code,
        ).toBe(
          workerProfile.code,
        )

        expect(
          arkl.reading,
        ).toBe(
          reading.id,
        )

        expect(
          arkl.device_code,
        ).toBe(
          INTEGRATION_DEVICE_CODE,
        )

        expect(
          arkl.calculation_type,
        ).toBe("REALTIME")

        expect(
          Number(
            arkl.concentration_ppm,
          ),
        ).toBeCloseTo(
          25.4,
          3,
        )

        expect(
          Number(
            arkl.concentration_mg_m3,
          ),
        ).toBeCloseTo(
          35.56,
          3,
        )

        expect(
          Number(
            arkl.rq,
          ),
        ).toBeGreaterThan(1)

        expect(
          arkl.interpretation,
        ).toBe(
          "ABOVE_REFERENCE_LEVEL",
        )

        expect(
          arkl.source_simulated,
        ).toBe(true)


        expect(
          evaluation.alert,
        ).not.toBeNull()

        if (!evaluation.alert) {
          throw new Error(
            "Expected Alert evaluation result.",
          )
        }

        const alert =
          evaluation.alert

        expect(
          alert.worker_code,
        ).toBe(
          workerProfile.code,
        )

        expect(
          alert.device_code,
        ).toBe(
          INTEGRATION_DEVICE_CODE,
        )

        expect(
          alert.environmental_status,
        ).toBe("WARNING")

        expect(
          alert.environmental_severity,
        ).toBe("WARNING")

        expect(
          alert.risk_interpretation,
        ).toBe(
          "ABOVE_REFERENCE_LEVEL",
        )

        expect(
          alert.alert_level,
        ).toBe("HIGH")

        expect(
          alert.risk_status,
        ).toBe(
          "RISK_MANAGEMENT_REQUIRED",
        )

        expect(
          [
            "OPEN",
            "ACKNOWLEDGED",
          ],
        ).toContain(
          alert.status,
        )


        if (
          evaluation.created ||
          evaluation.escalated
        ) {
          expect(
            alert.arkl_result_id,
          ).toBe(
            arkl.id,
          )

          expect(
            alert.reading_id,
          ).toBe(
            reading.id,
          )
        }


        const recommendationCodes =
          alert.recommendation_codes

        expect(
          Array.isArray(
            recommendationCodes,
          ),
        ).toBe(true)

        if (
          !Array.isArray(
            recommendationCodes,
          )
        ) {
          throw new Error(
            "recommendation_codes must be an array.",
          )
        }

        expect(
          recommendationCodes.length,
        ).toBeGreaterThan(0)


        /*
         * Worker visibility.
         */
        await logout()

        await login(
          integrationUsers.worker,
        )

        const myARKLResults =
          await getMyARKLResults()

        const workerARKL =
          myARKLResults.find(
            (item) =>
              item.id ===
              arkl.id,
          )

        expect(
          workerARKL,
        ).toBeDefined()

        expect(
          workerARKL?.worker,
        ).toBe(workerId)


        const myAlerts =
          await getMyAlerts()

        const workerAlert =
          myAlerts.find(
            (item) =>
              item.id ===
              alert.id,
          )

        expect(
          workerAlert,
        ).toBeDefined()

        expect(
          workerAlert?.worker_code,
        ).toBe(
          workerProfile.code,
        )

        expect(
          workerAlert?.alert_level,
        ).toBe("HIGH")


        /*
         * Medical safety guardrail.
         */
        const serialized =
          JSON.stringify({
            arkl: workerARKL,
            alert: workerAlert,
          }).toLowerCase()

        expect(
          serialized,
        ).not.toContain(
          "terdiagnosis ispa",
        )

        expect(
          serialized,
        ).not.toContain(
          "anda terkena ispa",
        )

        expect(
          serialized,
        ).not.toContain(
          "persentase terkena ispa",
        )
      },
    )
  },
)