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

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export interface H2SChartReading {
  id:
    | number
    | string

  ppm: number

  received_at: string
}

interface H2SHistoryChartProps {
  readings: H2SChartReading[]

  maxPoints?: number

  title?: string
}

const chartConfig = {
  ppm: {
    label: "H₂S",
    color:
      "var(--primary)",
  },
} satisfies ChartConfig

function formatPPM(
  value: number,
) {
  return new Intl.NumberFormat(
    "id-ID",
    {
      maximumFractionDigits: 3,
    },
  ).format(value)
}

function formatShortDateTime(
  value: string,
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

export function H2SHistoryChart({
  readings,
  maxPoints = 30,
  title = "Riwayat H₂S",
}: H2SHistoryChartProps) {
  const chartData =
    useMemo(() => {
      return [
        ...readings,
      ]
        .filter(
          (reading) =>
            Number.isFinite(
              reading.ppm,
            ) &&
            !Number.isNaN(
              Date.parse(
                reading.received_at,
              ),
            ),
        )
        .sort(
          (a, b) =>
            Date.parse(
              a.received_at,
            ) -
            Date.parse(
              b.received_at,
            ),
        )
        .slice(
          -maxPoints,
        )
        .map(
          (reading) => ({
            id:
              reading.id,

            ppm:
              reading.ppm,

            timestamp:
              reading.received_at,

            label:
              formatShortDateTime(
                reading.received_at,
              ),
          }),
        )
    }, [
      maxPoints,
      readings,
    ])

  const values =
    useMemo(
      () =>
        chartData.map(
          (item) =>
            item.ppm,
        ),
      [chartData],
    )

  const minimum =
    values.length > 0
      ? Math.min(
          ...values,
        )
      : null

  const maximum =
    values.length > 0
      ? Math.max(
          ...values,
        )
      : null

  const average =
    values.length > 0
      ? values.reduce(
          (
            total,
            value,
          ) =>
            total +
            value,
          0,
        ) /
        values.length
      : null

  if (
    chartData.length <
    2
  ) {
    return (
      <div
        className="
          flex
          min-h-56
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
          Data belum cukup
        </p>

        <p
          className="
            mt-1
            max-w-sm
            text-xs
            leading-relaxed
            text-muted-foreground
          "
        >
          Minimal dua pembacaan
          diperlukan untuk
          menampilkan grafik
          {title
            ? ` ${title.toLowerCase()}`
            : ""}.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div
        className="
          grid
          grid-cols-3
          gap-2
          sm:gap-3
        "
      >
        <div
          className="
            rounded-xl
            bg-muted/40
            p-3
          "
        >
          <p
            className="
              text-[11px]
              text-muted-foreground
              sm:text-xs
            "
          >
            Minimum
          </p>

          <p
            className="
              mt-1
              text-sm
              font-semibold
              tabular-nums
            "
          >
            {minimum ===
            null
              ? "—"
              : formatPPM(
                  minimum,
                )}

            <span
              className="
                ml-1
                text-xs
                font-normal
                text-muted-foreground
              "
            >
              ppm
            </span>
          </p>
        </div>

        <div
          className="
            rounded-xl
            bg-muted/40
            p-3
          "
        >
          <p
            className="
              text-[11px]
              text-muted-foreground
              sm:text-xs
            "
          >
            Rata-rata
          </p>

          <p
            className="
              mt-1
              text-sm
              font-semibold
              tabular-nums
            "
          >
            {average ===
            null
              ? "—"
              : formatPPM(
                  average,
                )}

            <span
              className="
                ml-1
                text-xs
                font-normal
                text-muted-foreground
              "
            >
              ppm
            </span>
          </p>
        </div>

        <div
          className="
            rounded-xl
            bg-muted/40
            p-3
          "
        >
          <p
            className="
              text-[11px]
              text-muted-foreground
              sm:text-xs
            "
          >
            Maksimum
          </p>

          <p
            className="
              mt-1
              text-sm
              font-semibold
              tabular-nums
            "
          >
            {maximum ===
            null
              ? "—"
              : formatPPM(
                  maximum,
                )}

            <span
              className="
                ml-1
                text-xs
                font-normal
                text-muted-foreground
              "
            >
              ppm
            </span>
          </p>
        </div>
      </div>

      {/* Chart */}
      <div
        className="
          overflow-hidden
          rounded-xl
          border
          bg-background
          p-2
          sm:p-3
        "
      >
        <ChartContainer
          config={
            chartConfig
          }
          className="
            aspect-auto
            h-[240px]
            w-full
            sm:h-[280px]
          "
        >
          <LineChart
            accessibilityLayer
            data={
              chartData
            }
            margin={{
              top: 12,
              right: 12,
              bottom: 4,
              left: 0,
            }}
          >
            <CartesianGrid
              vertical={
                false
              }
            />

            <XAxis
              dataKey="label"
              tickLine={
                false
              }
              axisLine={
                false
              }
              tickMargin={
                8
              }
              minTickGap={
                32
              }
              tickFormatter={(
                value,
              ) =>
                String(
                  value,
                )
              }
            />

            <YAxis
              tickLine={
                false
              }
              axisLine={
                false
              }
              tickMargin={
                8
              }
              width={48}
              domain={[
                "auto",
                "auto",
              ]}
              tickFormatter={(
                value,
              ) =>
                formatPPM(
                  Number(
                    value,
                  ),
                )
              }
            />

            <ChartTooltip
              cursor={
                false
              }
              content={
                <ChartTooltipContent
                  labelFormatter={(
                    _label,
                    payload,
                  ) => {
                    const timestamp =
                      payload?.[0]
                        ?.payload
                        ?.timestamp

                    return timestamp
                      ? formatShortDateTime(
                          String(
                            timestamp,
                          ),
                        )
                      : "—"
                  }}
                  formatter={(
                    value,
                  ) => (
                    <div
                      className="
                        flex
                        w-full
                        items-center
                        justify-between
                        gap-4
                      "
                    >
                      <span className="text-muted-foreground">
                        H₂S
                      </span>

                      <span className="font-mono font-medium tabular-nums">
                        {formatPPM(
                          Number(
                            value,
                          ),
                        )}{" "}
                        ppm
                      </span>
                    </div>
                  )}
                />
              }
            />

            <Line
              dataKey="ppm"
              type="monotone"
              stroke="var(--color-ppm)"
              strokeWidth={
                2.5
              }
              dot={{
                r: 3,
                fill:
                  "var(--color-ppm)",
              }}
              activeDot={{
                r: 5,
              }}
              isAnimationActive
            />
          </LineChart>
        </ChartContainer>
      </div>

      {/* Footer */}
      <div
        className="
          flex
          flex-col
          gap-1
          text-xs
          text-muted-foreground
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >
        <span>
          {
            chartData.length
          }{" "}
          titik data
        </span>

        <span>
          {formatShortDateTime(
            chartData[0]
              .timestamp,
          )}
          {" — "}
          {formatShortDateTime(
            chartData[
              chartData.length -
                1
            ].timestamp,
          )}
        </span>
      </div>
    </div>
  )
}