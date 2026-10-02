import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest"

import {
  login,
  logout,
} from "@/api/auth"

import {
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


const LIVE_DEVICE_CODE =
  integrationDevices.live

const READING_POLL_INTERVAL_MS =
  1_000

const ARKL_POLL_INTERVAL_MS =
  2_000

const MAX_READING_WAIT_MS =
  20_000

const MAX_ARKL_WAIT_MS =
  75_000


type WorkerARKLResult =
  Awaited<
    ReturnType<
      typeof getMyARKLResults
    >
  >[number]


async function sleep(
  milliseconds: number,
): Promise<void> {
  await new Promise(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds,
      )
    },
  )
}


function findLatestRealtimeARKL(
  results: WorkerARKLResult[],
): WorkerARKLResult | null {
  const realtimeResults =
    results.filter(
      (item) =>
        item.calculation_type ===
        "REALTIME",
    )

  if (
    realtimeResults.length === 0
  ) {
    return null
  }

  return realtimeResults.reduce(
    (
      latest,
      current,
    ) =>
      current.id > latest.id
        ? current
        : latest,
  )
}


async function waitForFreshReading(
  previousReadingId:
    | number
    | null,
) {
  const startedAt =
    Date.now()

  while (
    Date.now() - startedAt <
    MAX_READING_WAIT_MS
  ) {
    try {
      const reading =
        await getLatestReading({
          device_code:
            LIVE_DEVICE_CODE,
        })

      if (
        previousReadingId === null ||
        reading.id !==
          previousReadingId
      ) {
        return reading
      }
    } catch {
      // Device may not have published yet.
    }

    await sleep(
      READING_POLL_INTERVAL_MS,
    )
  }

  throw new Error(
    (
      "No fresh MQTT H2S reading " +
      `received for ${LIVE_DEVICE_CODE} ` +
      `within ${MAX_READING_WAIT_MS} ms.`
    ),
  )
}


async function waitForAutomaticARKL({
  previousARKLId,
  minimumReadingId,
}: {
  previousARKLId:
    | number
    | null
  minimumReadingId: number
}) {
  const startedAt =
    Date.now()

  while (
    Date.now() - startedAt <
    MAX_ARKL_WAIT_MS
  ) {
    const results =
      await getMyARKLResults()

    const latestRealtime =
      findLatestRealtimeARKL(
        results,
      )

    if (latestRealtime) {
      const isNewResult =
        previousARKLId === null ||
        latestRealtime.id >
          previousARKLId

      const readingId =
        latestRealtime.reading

      const usesLiveStream =
        typeof readingId ===
          "number" &&
        readingId >=
          minimumReadingId

      if (
        isNewResult &&
        usesLiveStream
      ) {
        return latestRealtime
      }
    }

    await sleep(
      ARKL_POLL_INTERVAL_MS,
    )
  }

  throw new Error(
    (
      "Automatic realtime ARKL was not " +
      "created from the live MQTT stream " +
      `within ${MAX_ARKL_WAIT_MS} ms.`
    ),
  )
}


describe(
  "LIVE IoT FE ↔ BE integration",
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
        "Wokwi → MQTT → Django → " +
        "automatic ARKL → Worker"
      ),
      async () => {
        /*
         * Worker used here is dedicated to
         * the live H2S-TPA-001 device.
         */
        const workerLogin =
          await login(
            integrationUsers.liveWorker,
          )

        expect(
          workerLogin.user.role,
        ).toBe("WORKER")

        const workerId =
          workerLogin.user.worker_id

        expect(
          workerId,
        ).not.toBeNull()

        if (
          workerId === null
        ) {
          throw new Error(
            "Live Worker is not linked.",
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
         * Capture current ARKL baseline before
         * waiting for new MQTT telemetry.
         */
        const initialARKLs =
          await getMyARKLResults()

        const previousRealtime =
          findLatestRealtimeARKL(
            initialARKLs,
          )

        const previousARKLId =
          previousRealtime?.id ??
          null

        const alertsBefore =
          await getMyAlerts()

        const alertIdsBefore =
          new Set(
            alertsBefore.map(
              (alert) =>
                alert.id,
            ),
          )


        /*
         * Operator only observes telemetry.
         * No manual ARKL calculation is made.
         */
        await logout()

        const operator =
          await login(
            integrationUsers.operator,
          )

        expect(
          operator.user.role,
        ).toBe("OPERATOR")


        let previousReadingId:
          | number
          | null = null

        try {
          const previousReading =
            await getLatestReading({
              device_code:
                LIVE_DEVICE_CODE,
            })

          previousReadingId =
            previousReading.id
        } catch {
          previousReadingId =
            null
        }


        const liveReading =
          await waitForFreshReading(
            previousReadingId,
          )

        expect(
          liveReading.device_code,
        ).toBe(
          LIVE_DEVICE_CODE,
        )

        expect(
          liveReading.id,
        ).not.toBe(
          previousReadingId,
        )

        expect(
          liveReading.ppm,
        ).toBeGreaterThanOrEqual(
          0,
        )

        expect(
          liveReading.received_at,
        ).toBeTruthy()


        const readingTime =
          Date.parse(
            liveReading.received_at,
          )

        expect(
          Number.isNaN(
            readingTime,
          ),
        ).toBe(false)

        expect(
          Date.now() -
            readingTime,
        ).toBeLessThan(
          60_000,
        )


        /*
         * Return to Worker and wait for backend
         * MQTT orchestration.
         */
        await logout()

        await login(
          integrationUsers.liveWorker,
        )


        const arkl =
          await waitForAutomaticARKL({
            previousARKLId,
            minimumReadingId:
              liveReading.id,
          })


        expect(
          arkl.worker,
        ).toBe(workerId)

        expect(
          arkl.device_code,
        ).toBe(
          LIVE_DEVICE_CODE,
        )

        expect(
          arkl.calculation_type,
        ).toBe("REALTIME")

        expect(
          arkl.reading,
        ).not.toBeNull()

        expect(
          typeof arkl.reading,
        ).toBe("number")

        if (
          typeof arkl.reading ===
          "number"
        ) {
          expect(
            arkl.reading,
          ).toBeGreaterThanOrEqual(
            liveReading.id,
          )
        }

        expect(
          Number(
            arkl.concentration_ppm,
          ),
        ).toBeGreaterThanOrEqual(
          0,
        )

        expect(
          arkl.source_simulated,
        ).toBe(true)


        /*
         * ARKL must be visible from the
         * Worker's personal endpoint.
         */
        const workerARKLs =
          await getMyARKLResults()

        expect(
          workerARKLs.some(
            (item) =>
              item.id ===
              arkl.id,
          ),
        ).toBe(true)


        /*
         * Alert creation is conditional.
         * We only verify ownership for alerts
         * visible to this Worker.
         */
        const alertsAfter =
          await getMyAlerts()

        for (
          const alert
          of alertsAfter
        ) {
          expect(
            alert.worker_code,
          ).toBe(
            workerProfile.code,
          )
        }

        const newAlerts =
          alertsAfter.filter(
            (alert) =>
              !alertIdsBefore.has(
                alert.id,
              ),
          )

        for (
          const alert
          of newAlerts
        ) {
          expect(
            alert.worker_code,
          ).toBe(
            workerProfile.code,
          )
        }


        expect(
          arkl.created_at,
        ).toBeTruthy()

        const arklTime =
          Date.parse(
            arkl.created_at,
          )

        expect(
          Number.isNaN(
            arklTime,
          ),
        ).toBe(false)

        expect(
          arklTime,
        ).toBeGreaterThanOrEqual(
          readingTime,
        )
      },
      90_000,
    )
  },
)