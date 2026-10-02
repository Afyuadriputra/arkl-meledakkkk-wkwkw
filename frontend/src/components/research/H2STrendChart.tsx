import {
  useMemo,
} from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"

import type {
  H2SAggregatedTrendPoint,
  H2SRawTrendPoint,
  H2STrendInterval,
  H2STrendPoint,
} from "@/api/research"

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"


interface H2STrendChartProps {
  data: H2STrendPoint[]
  interval: H2STrendInterval
}


interface ChartPoint {
  timestamp: string
  ppm: number
  minimum_ppm?: number
  maximum_ppm?: number
  sample_count?: number
  device_code?: string
  simulated?: boolean
}


const chartConfig = {
  ppm: {
    label: "H₂S",
    color: "var(--primary)",
  },
} satisfies ChartConfig


function isAggregatedPoint(
  point: H2STrendPoint,
): point is H2SAggregatedTrendPoint {
  return "average_ppm" in point
}


function isRawPoint(
  point: H2STrendPoint,
): point is H2SRawTrendPoint {
  return "ppm" in point
}


function formatNumber(
  value: number,
  digits = 2,
) {
  return new Intl.NumberFormat(
    "id-ID",
    {
      maximumFractionDigits: digits,
    },
  ).format(value)
}


function formatTimestamp(
  value: string,
  interval: H2STrendInterval,
) {
  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—"
  }

  if (interval === "day") {
    return new Intl.DateTimeFormat(
      "id-ID",
      {
        day: "2-digit",
        month: "short",
      },
    ).format(date)
  }

  if (interval === "hour") {
    return new Intl.DateTimeFormat(
      "id-ID",
      {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      },
    ).format(date)
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    },
  ).format(date)
}


function normalizeTrendPoint(
  point: H2STrendPoint,
): ChartPoint | null {
  if (
    Number.isNaN(
      Date.parse(
        point.timestamp,
      ),
    )
  ) {
    return null
  }

  if (
    isAggregatedPoint(
      point,
    )
  ) {
    if (
      !Number.isFinite(
        point.average_ppm,
      )
    ) {
      return null
    }

    return {
      timestamp:
        point.timestamp,

      ppm:
        point.average_ppm,

      minimum_ppm:
        point.minimum_ppm,

      maximum_ppm:
        point.maximum_ppm,

      sample_count:
        point.sample_count,
    }
  }

  if (
    isRawPoint(
      point,
    )
  ) {
    if (
      !Number.isFinite(
        point.ppm,
      )
    ) {
      return null
    }

    return {
      timestamp:
        point.timestamp,

      ppm:
        point.ppm,

      device_code:
        point.device_code,

      simulated:
        point.simulated,
    }
  }

  return null
}


export function H2STrendChart({
  data,
  interval,
}: H2STrendChartProps) {
  const chartData =
    useMemo(
      () =>
        data
          .map(
            normalizeTrendPoint,
          )
          .filter(
            (
              point,
            ): point is ChartPoint =>
              point !== null,
          )
          .sort(
            (a, b) =>
              Date.parse(
                a.timestamp,
              ) -
              Date.parse(
                b.timestamp,
              ),
          ),
      [data],
    )


  if (
    chartData.length <
    2
  ) {
    return (
      <div
        className="
          flex
          min-h-64
          flex-col
          items-center
          justify-center
          rounded-xl
          border
          border-dashed
          px-6
          text-center
        "
      >
        <p className="text-sm font-medium">
          Data tren belum cukup
        </p>

        <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
          Minimal dua titik waktu diperlukan
          untuk menampilkan tren H₂S.
        </p>
      </div>
    )
  }


  return (
    <ChartContainer
      config={chartConfig}
      className="
        aspect-auto
        h-[280px]
        w-full
        sm:h-[320px]
      "
    >
      <LineChart
        accessibilityLayer
        data={chartData}
        margin={{
          top: 12,
          right: 12,
          left: 0,
          bottom: 4,
        }}
      >
        <CartesianGrid
          vertical={false}
        />

        <XAxis
          dataKey="timestamp"
          axisLine={false}
          tickLine={false}
          tickMargin={8}
          minTickGap={28}
          tickFormatter={(
            value,
          ) =>
            formatTimestamp(
              String(value),
              interval,
            )
          }
        />

        <YAxis
          axisLine={false}
          tickLine={false}
          tickMargin={8}
          width={54}
          domain={[
            0,
            "auto",
          ]}
          tickFormatter={(
            value,
          ) =>
            formatNumber(
              Number(value),
              1,
            )
          }
        />

        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(
                _label,
                payload,
              ) => {
                const point =
                  payload?.[0]
                    ?.payload as
                    | ChartPoint
                    | undefined

                if (!point) {
                  return "—"
                }

                return new Intl.DateTimeFormat(
                  "id-ID",
                  {
                    dateStyle:
                      "medium",

                    timeStyle:
                      interval ===
                      "day"
                        ? undefined
                        : "short",
                  },
                ).format(
                  new Date(
                    point.timestamp,
                  ),
                )
              }}
              formatter={(
                value,
                _name,
                item,
              ) => {
                const point =
                  item.payload as
                    | ChartPoint
                    | undefined

                return (
                  <div className="grid w-full min-w-44 gap-1.5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        {interval ===
                        "raw"
                          ? "H₂S"
                          : "Rata-rata"}
                      </span>

                      <span className="font-mono font-medium tabular-nums">
                        {formatNumber(
                          Number(
                            value,
                          ),
                          3,
                        )}{" "}
                        ppm
                      </span>
                    </div>


                    {point &&
                    interval !==
                      "raw" ? (
                      <>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            Minimum
                          </span>

                          <span className="font-mono tabular-nums">
                            {formatNumber(
                              point.minimum_ppm ??
                                0,
                              3,
                            )}{" "}
                            ppm
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            Maksimum
                          </span>

                          <span className="font-mono tabular-nums">
                            {formatNumber(
                              point.maximum_ppm ??
                                0,
                              3,
                            )}{" "}
                            ppm
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            Sampel
                          </span>

                          <span className="font-mono tabular-nums">
                            {
                              point.sample_count ??
                              0
                            }
                          </span>
                        </div>
                      </>
                    ) : null}


                    {point &&
                    interval ===
                      "raw" ? (
                      <>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            Perangkat
                          </span>

                          <span className="font-mono text-xs">
                            {
                              point.device_code ??
                              "—"
                            }
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            Sumber
                          </span>

                          <span className="text-xs font-medium">
                            {point.simulated
                              ? "Simulasi"
                              : "Fisik"}
                          </span>
                        </div>
                      </>
                    ) : null}
                  </div>
                )
              }}
            />
          }
        />

        <Line
          dataKey="ppm"
          type="monotone"
          stroke="var(--color-ppm)"
          strokeWidth={2.5}
          dot={{
            r:
              interval ===
              "raw"
                ? 1.5
                : 3,

            fill:
              "var(--color-ppm)",
          }}
          activeDot={{
            r: 5,
          }}
        />
      </LineChart>
    </ChartContainer>
  )
}