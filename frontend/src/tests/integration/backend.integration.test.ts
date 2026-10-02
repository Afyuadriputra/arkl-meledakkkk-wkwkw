import {
  describe,
  expect,
  it,
} from "vitest";

import apiClient from "@/api/client";


function hasResponseStatus(
  error: unknown,
): error is {
  response: {
    status: number;
  };
} {
  if (
    typeof error !== "object" ||
    error === null ||
    !("response" in error)
  ) {
    return false;
  }

  const response =
    (
      error as {
        response?: unknown;
      }
    ).response;

  return (
    typeof response === "object" &&
    response !== null &&
    "status" in response &&
    typeof (
      response as {
        status?: unknown;
      }
    ).status === "number"
  );
}


describe(
  "Frontend → Backend connectivity",
  () => {
    it(
      "can reach Django API",
      async () => {
        try {
          await apiClient.get(
            "/auth/me/",
          );
        } catch (error: unknown) {
          /**
           * 401 is acceptable here.
           *
           * It proves:
           * - Django is reachable
           * - route exists
           * - DRF responded
           */
          if (
            !hasResponseStatus(
              error,
            )
          ) {
            throw error;
          }

          expect(
            error.response.status,
          ).toBe(401);

          return;
        }

        throw new Error(
          "Expected unauthenticated request to return 401.",
        );
      },
    );
  },
);