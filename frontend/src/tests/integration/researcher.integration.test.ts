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
  exportARKLCSV,
  getAlertSummary,
  getExposureSummary,
  getH2SSummary,
  getH2STrends,
  getResearchARKLResults,
  getRiskDistribution,

} from "@/api/research";

import {
  clearStoredToken,
} from "@/api/tokenStorage";

import {
  integrationUsers,
} from "./env";


describe(
  "RESEARCHER API integration",
  () => {
    afterEach(async () => {
      try {
        await logout();
      } catch {
        clearStoredToken();
      }
    });


    it(
      "login → auth/me → researcher identity",
      async () => {
        const loginResponse =
          await login(
            integrationUsers.researcher,
          );

        expect(
          loginResponse.token,
        ).toBeTruthy();

        expect(
          loginResponse.user.role,
        ).toBe("RESEARCHER");

        const currentUser =
          await getCurrentUser();

        expect(
          currentUser.username,
        ).toBe(
          integrationUsers.researcher
            .username,
        );

        expect(
          currentUser.role,
        ).toBe("RESEARCHER");
      },
    );


    it(
      "can access researcher dashboard endpoints",
      async () => {
        await login(
          integrationUsers.researcher,
        );

        const [
          h2s,
          risk,
          exposure,
          alerts,
        ] =
          await Promise.all([
            getH2SSummary(),
            getRiskDistribution(),
            getExposureSummary(),
            getAlertSummary(),
          ]);


        expect(
          typeof h2s.sample_count,
        ).toBe("number");

        expect(
          typeof h2s.minimum_ppm,
        ).toBe("number");

        expect(
          typeof h2s.average_ppm,
        ).toBe("number");

        expect(
          typeof h2s.maximum_ppm,
        ).toBe("number");

        expect(
          typeof h2s.simulated_count,
        ).toBe("number");

        expect(
          typeof h2s.physical_count,
        ).toBe("number");

        expect(
          typeof h2s.device_count,
        ).toBe("number");


        expect(
          Array.isArray(
            risk.distribution,
          ),
        ).toBe(true);


        expect(
          typeof exposure.worker_count,
        ).toBe("number");


        expect(
          typeof alerts.total_count,
        ).toBe("number");

        expect(
          typeof alerts.simulated_count,
        ).toBe("number");

        expect(
          typeof alerts.physical_count,
        ).toBe("number");

        expect(
          Array.isArray(
            alerts.by_level,
          ),
        ).toBe(true);

        expect(
          Array.isArray(
            alerts.by_status,
          ),
        ).toBe(true);
      },
    );


it(
  "can read H2S trend with raw interval",
  async () => {
    await login(
      integrationUsers.researcher,
    );

    const trend =
      await getH2STrends({
        interval: "raw",
      });

    expect(
      trend.interval,
    ).toBe("raw");

    expect(
      Array.isArray(
        trend.series,
      ),
    ).toBe(true);

    if (
      trend.interval !==
      "raw"
    ) {
      throw new Error(
        "Expected raw H2S trend response.",
      );
    }

    for (
      const point of
      trend.series
    ) {
      expect(
        point.timestamp,
      ).toBeTruthy();

      expect(
        typeof point.ppm,
      ).toBe("number");

      expect(
        point.device_code,
      ).toBeTruthy();

      expect(
        typeof point.simulated,
      ).toBe("boolean");
    }
  },
);


    it(
      "can filter H2S research data by source",
      async () => {
        await login(
          integrationUsers.researcher,
        );

        const physicalSummary =
          await getH2SSummary({
            source_simulated:
              false,
          });

        const simulatedSummary =
          await getH2SSummary({
            source_simulated:
              true,
          });


        expect(
          typeof physicalSummary
            .sample_count,
        ).toBe("number");

        expect(
          physicalSummary
            .simulated_count,
        ).toBe(0);


        expect(
          typeof simulatedSummary
            .sample_count,
        ).toBe("number");

        expect(
          simulatedSummary
            .physical_count,
        ).toBe(0);
      },
    );


    it(
      "applies the same H2S filter to summary and trend",
      async () => {
        await login(
          integrationUsers.researcher,
        );

        const params = {
          source_simulated:
            true,
        } as const;


        const [
          summary,
          trend,
        ] =
          await Promise.all([
            getH2SSummary(
              params,
            ),

            getH2STrends({
              ...params,
              interval:
                "day",
            }),
          ]);


        expect(
          typeof summary.sample_count,
        ).toBe("number");

        expect(
          summary.physical_count,
        ).toBe(0);

        expect(
          trend.interval,
        ).toBe("day");

        expect(
          Array.isArray(
            trend.series,
          ),
        ).toBe(true);
      },
    );


    it(
      "can access persisted ARKL research results",
      async () => {
        await login(
          integrationUsers.researcher,
        );

        const response =
          await getResearchARKLResults();


        expect(
          typeof response.count,
        ).toBe("number");

        expect(
          Array.isArray(
            response.results,
          ),
        ).toBe(true);


        for (
          const result of
          response.results
        ) {
          expect(
            result.id,
          ).toBeTruthy();

          expect(
            result.worker_code,
          ).toBeTruthy();

          expect(
            result.calculation_type ===
              "REALTIME" ||
              result.calculation_type ===
                "HISTORICAL",
          ).toBe(true);

          expect(
            Number.isFinite(
              Number(
                result.concentration_ppm,
              ),
            ),
          ).toBe(true);

          expect(
            Number.isFinite(
              Number(
                result.rq,
              ),
            ),
          ).toBe(true);

          expect(
            [
              "WITHIN_REFERENCE_LEVEL",
              "ABOVE_REFERENCE_LEVEL",
            ],
          ).toContain(
            result.interpretation,
          );
        }
      },
    );


    it(
      "can filter persisted ARKL results",
      async () => {
        await login(
          integrationUsers.researcher,
        );

        const realtime =
          await getResearchARKLResults({
            calculation_type:
              "REALTIME",
          });


        expect(
          Array.isArray(
            realtime.results,
          ),
        ).toBe(true);


        for (
          const result of
          realtime.results
        ) {
          expect(
            result.calculation_type,
          ).toBe("REALTIME");
        }


        const simulated =
          await getResearchARKLResults({
            source_simulated:
              true,
          });


        expect(
          Array.isArray(
            simulated.results,
          ),
        ).toBe(true);


        for (
          const result of
          simulated.results
        ) {
          expect(
            result.source_simulated,
          ).toBe(true);
        }
      },
    );


    it(
      "can export persisted ARKL data as CSV",
      async () => {
        await login(
          integrationUsers.researcher,
        );

        const blob =
          await exportARKLCSV();


        expect(
          blob,
        ).toBeInstanceOf(
          Blob,
        );

        expect(
          blob.size,
        ).toBeGreaterThan(0);
      },
    );
  },
);