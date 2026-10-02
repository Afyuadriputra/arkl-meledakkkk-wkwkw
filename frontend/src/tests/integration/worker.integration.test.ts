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
  getMyAlerts,
  getMyARKLResults,
  getMyExposure,
  getMyMonitoring,
  getMyProfile,
} from "@/api/worker"

import {
  clearStoredToken,
} from "@/api/tokenStorage"

import {
  integrationUsers,
} from "./env"


function hasStatus(
  error: unknown,
): error is {
  status: number
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (
      error as {
        status?: unknown
      }
    ).status === "number"
  )
}


describe(
  "WORKER API integration",
  () => {
    afterEach(async () => {
      try {
        await logout()
      } catch {
        clearStoredToken()
      }
    })


    it(
      "login → me → personal worker endpoints",
      async () => {
        const loginResponse =
          await login(
            integrationUsers.worker,
          )

        expect(
          loginResponse.user.role,
        ).toBe("WORKER")

        expect(
          loginResponse.user.worker_id,
        ).not.toBeNull()


        const me =
          await getCurrentUser()

        expect(
          me.role,
        ).toBe("WORKER")


        const profile =
          await getMyProfile()

        expect(
          profile.id,
        ).toBe(
          me.worker_id,
        )

        expect(
          profile.code,
        ).toBe(
          me.worker_code,
        )


        const arklResults =
          await getMyARKLResults()

        expect(
          Array.isArray(
            arklResults,
          ),
        ).toBe(true)


        const alerts =
          await getMyAlerts()

        expect(
          Array.isArray(
            alerts,
          ),
        ).toBe(true)
      },
    )


    it(
      "reads personal exposure or receives expected 404",
      async () => {
        await login(
          integrationUsers.worker,
        )

        try {
          const exposure =
            await getMyExposure()

          expect(
            exposure.worker_code,
          ).toBeTruthy()

          expect(
            exposure.inhalation_rate,
          ).toBeGreaterThan(0)
        } catch (
          error: unknown
        ) {
          if (
            !hasStatus(error)
          ) {
            throw error
          }

          expect(
            error.status,
          ).toBe(404)
        }
      },
    )


    it(
      "reads assigned monitoring device or receives expected 404",
      async () => {
        await login(
          integrationUsers.worker,
        )

        try {
          const monitoring =
            await getMyMonitoring()

          expect(
            monitoring.device,
          ).toBeTruthy()

          expect(
            monitoring.device
              .device_code,
          ).toBeTruthy()

          if (
            monitoring.reading
          ) {
            expect(
              monitoring.reading
                .device_code,
            ).toBe(
              monitoring.device
                .device_code,
            )

            expect(
              typeof monitoring
                .reading.ppm,
            ).toBe("number")

            expect(
              monitoring.reading
                .received_at,
            ).toBeTruthy()
          }
        } catch (
          error: unknown
        ) {
          if (
            !hasStatus(error)
          ) {
            throw error
          }

          expect(
            error.status,
          ).toBe(404)
        }
      },
    )
  },
)