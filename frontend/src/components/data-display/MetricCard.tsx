import type { ReactNode } from "react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  icon?: ReactNode
  status?: ReactNode
  description?: ReactNode
  className?: string
}

export function MetricCard({
  label,
  value,
  unit,
  icon,
  status,
  description,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          {icon ? (
            <div className="shrink-0 text-muted-foreground">
              {icon}
            </div>
          ) : null}

          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
        </div>

        {status ? (
          <div className="shrink-0">
            {status}
          </div>
        ) : null}
      </CardHeader>

      <CardContent>
        <div className="flex items-end gap-2">
          <span className="numeric-data text-3xl font-bold tracking-tight sm:text-4xl">
            {value}
          </span>

          {unit ? (
            <span className="mb-1 text-sm text-muted-foreground">
              {unit}
            </span>
          ) : null}
        </div>

        {description ? (
          <div className="mt-3 text-sm text-muted-foreground">
            {description}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}