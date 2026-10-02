import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest"

import {
  acknowledgeAlert,
  resolveAlert,
} from "@/api/alerts"

import {
  calculateRealtimeARKL,
} from "@/api/arkl"

import {
  login,
  logout,
} from "@/api/auth"

import {
  getDevices,
} from "@/api/monitoring"

import {
  clearStoredToken,
} from "@/api/tokenStorage"

import {
  getMyAlerts,
  getMyProfile,
} from "@/api/worker"

import {
  integrationDevices,
  integrationUsers,
} from "./env"


const INTEGRATION_DEVICE_CODE =
  integrationDevices.deterministic


function expectAuditField(
  object: Record<
    string,
    unknown
  >,
  field: string,
) {
  expect(
    object[field],
  ).not.toBeNull()

  expect(
    object[field],
  ).not.toBeUndefined()
}


describe(
  "Alert lifecycle integration",
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
        "OPEN → ACKNOWLEDGED → " +
        "RESOLVED with Worker visibility"
      ),
      async () => {
        /*
         * Deterministic Worker.
         */
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


        await logout()

        await login(
          integrationUsers.operator,
        )


        /*
         * Deterministic non-live device.
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
              "Integration device " +
              `${INTEGRATION_DEVICE_CODE} ` +
              "was not found."
            ),
          )
        }

        if (!device.is_active) {
          throw new Error(
            (
              "Integration device " +
              `${INTEGRATION_DEVICE_CODE} ` +
              "must be active."
            ),
          )
        }


        /*
         * Create/evaluate first result and use
         * the public lifecycle API to clear any
         * retained active Alert.
         */
        const firstRealtime =
          await calculateRealtimeARKL({
            worker: workerId,
            device: device.id,
          })

        const firstAlert =
          firstRealtime
            .alert_evaluation
            .alert

        expect(
          firstAlert,
        ).not.toBeNull()

        if (!firstAlert) {
          throw new Error(
            "Expected an Alert.",
          )
        }


        if (
          firstAlert.status ===
          "OPEN"
        ) {
          await acknowledgeAlert(
            firstAlert.id,
          )

          await resolveAlert(
            firstAlert.id,
          )
        } else if (
          firstAlert.status ===
          "ACKNOWLEDGED"
        ) {
          await resolveAlert(
            firstAlert.id,
          )
        }


        /*
         * New calculation after active state has
         * been resolved must produce a fresh OPEN
         * Alert.
         */
        const freshRealtime =
          await calculateRealtimeARKL({
            worker: workerId,
            device: device.id,
          })

        const openAlert =
          freshRealtime
            .alert_evaluation
            .alert

        expect(
          freshRealtime
            .alert_evaluation
            .created,
        ).toBe(true)

        expect(
          openAlert,
        ).not.toBeNull()

        if (!openAlert) {
          throw new Error(
            "Expected fresh OPEN Alert.",
          )
        }

        expect(
          openAlert.status,
        ).toBe("OPEN")

        expect(
          openAlert.alert_level,
        ).toBe("HIGH")

        expect(
          openAlert.worker_code,
        ).toBe(
          workerProfile.code,
        )


        /*
         * OPEN → ACKNOWLEDGED
         */
        const acknowledged =
          await acknowledgeAlert(
            openAlert.id,
          )

        expect(
          acknowledged.id,
        ).toBe(openAlert.id)

        expect(
          acknowledged.status,
        ).toBe(
          "ACKNOWLEDGED",
        )

        expectAuditField(
          acknowledged as unknown as Record<
            string,
            unknown
          >,
          "acknowledged_by",
        )

        expectAuditField(
          acknowledged as unknown as Record<
            string,
            unknown
          >,
          "acknowledged_at",
        )


        /*
         * Worker sees acknowledged state.
         */
        await logout()

        await login(
          integrationUsers.worker,
        )

        const alertsAfterAck =
          await getMyAlerts()

        const workerAcknowledged =
          alertsAfterAck.find(
            (item) =>
              item.id ===
              openAlert.id,
          )

        expect(
          workerAcknowledged
            ?.status,
        ).toBe(
          "ACKNOWLEDGED",
        )


        /*
         * ACKNOWLEDGED → RESOLVED
         */
        await logout()

        await login(
          integrationUsers.operator,
        )

        const resolved =
          await resolveAlert(
            openAlert.id,
          )

        expect(
          resolved.id,
        ).toBe(openAlert.id)

        expect(
          resolved.status,
        ).toBe("RESOLVED")

        expectAuditField(
          resolved as unknown as Record<
            string,
            unknown
          >,
          "resolved_by",
        )

        expectAuditField(
          resolved as unknown as Record<
            string,
            unknown
          >,
          "resolved_at",
        )


        /*
         * Worker sees resolved state.
         */
        await logout()

        await login(
          integrationUsers.worker,
        )

        const alertsAfterResolve =
          await getMyAlerts()

        const workerResolved =
          alertsAfterResolve.find(
            (item) =>
              item.id ===
              openAlert.id,
          )

        expect(
          workerResolved,
        ).toBeDefined()

        expect(
          workerResolved?.status,
        ).toBe("RESOLVED")

        expect(
          workerResolved
            ?.alert_level,
        ).toBe("HIGH")

        expect(
          workerResolved
            ?.worker_code,
        ).toBe(
          workerProfile.code,
        )


        const serialized =
          JSON.stringify(
            workerResolved,
          ).toLowerCase()

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