import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  getMyMonitoring,
} from "@/api/worker"

import {
  login,
  logout,
} from "@/api/auth";

import {
  getDevices,
  getLatestReading,
} from "@/api/monitoring";

import {
  getH2SSummary,
} from "@/api/research";

import {
  clearStoredToken,
} from "@/api/tokenStorage";

import {
  integrationUsers,
} from "./env";


describe(
  "Frontend ↔ Backend RBAC",
  () => {
    afterEach(async () => {
      try {
        await logout();
      } catch {
        clearStoredToken();
      }
    });


    it(
      "WORKER cannot access generic devices API",
      async () => {
        await login(
          integrationUsers.worker,
        );

        await expect(
          getDevices(),
        ).rejects.toMatchObject({
          status: 403,
        });
      },
    );


    it(
      "WORKER cannot access research API",
      async () => {
        await login(
          integrationUsers.worker,
        );

        await expect(
          getH2SSummary(),
        ).rejects.toMatchObject({
          status: 403,
        });
      },
    );


    it(
      "RESEARCHER can read generic devices API",
      async () => {
        await login(
          integrationUsers.researcher,
        );

        const devices =
          await getDevices();

        expect(
          Array.isArray(
            devices.results,
          ),
        ).toBe(true);
      },
    );


    it(
      "RESEARCHER can read latest operational H2S reading when data exists",
      async () => {
        await login(
          integrationUsers.researcher,
        );

        const reading =
          await getLatestReading();

        expect(
          typeof reading.ppm,
        ).toBe("number");

        expect(
          reading.device_code,
        ).toBeTruthy();

        expect(
          reading.received_at,
        ).toBeTruthy();
      },
    );


    it(
      "RESEARCHER can access research API",
      async () => {
        await login(
          integrationUsers.researcher,
        );

        const summary =
          await getH2SSummary();

        expect(
          typeof summary.sample_count,
        ).toBe("number");
      },
    );
  },
);

it(
  "WORKER can access personal monitoring endpoint or receives expected 404 when no device is assigned",
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
    } catch (
      error: unknown
    ) {
      if (
        typeof error !== "object" ||
        error === null ||
        !("status" in error)
      ) {
        throw error
      }

      expect(
        (
          error as {
            status: number
          }
        ).status,
      ).toBe(404)
    }
  },
)