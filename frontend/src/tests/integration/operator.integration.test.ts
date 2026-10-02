import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  getCurrentUser,
  login,
  logout,
} from "@/api/auth";

import {
  getDevices,
  getLatestReading,
} from "@/api/monitoring";

import {
  clearStoredToken,
} from "@/api/tokenStorage";

import {
  integrationUsers,
} from "./env";


function hasStatus(
  error: unknown,
): error is {
  status: number;
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (
      error as {
        status?: unknown;
      }
    ).status === "number"
  );
}


describe(
  "OPERATOR API integration",
  () => {
    afterEach(async () => {
      try {
        await logout();
      } catch {
        clearStoredToken();
      }
    });

    it(
      "login → auth/me → devices",
      async () => {
        const loginResponse =
          await login(
            integrationUsers.operator,
          );

        expect(
          loginResponse.token,
        ).toBeTruthy();

        expect(
          loginResponse.user.role,
        ).toBe("OPERATOR");

        const currentUser =
          await getCurrentUser();

        expect(
          currentUser.username,
        ).toBe(
          integrationUsers.operator
            .username,
        );

        expect(
          currentUser.role,
        ).toBe("OPERATOR");

        const devices =
          await getDevices();

        expect(
          devices,
        ).toHaveProperty(
          "results",
        );

        expect(
          Array.isArray(
            devices.results,
          ),
        ).toBe(true);
      },
    );

    it(
      "can access latest H2S reading when data exists",
      async () => {
        await login(
          integrationUsers.operator,
        );

        try {
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
        } catch (error: unknown) {
          /**
           * 404 is allowed if test DB
           * has no reading yet.
           */
          if (
            !hasStatus(
              error,
            )
          ) {
            throw error;
          }

          expect(
            error.status,
          ).toBe(404);
        }
      },
    );
  },
);