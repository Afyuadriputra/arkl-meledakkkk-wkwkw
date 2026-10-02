import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type AlertLevel =
  | "NONE"
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL"

const alertLevelConfig: Record<
  AlertLevel,
  {
    label: string
    className: string
  }
> = {
  NONE: {
    label: "Tidak Ada",
    className:
      "border-border bg-muted text-muted-foreground",
  },
  LOW: {
    label: "Rendah",
    className:
      "border-transparent bg-alert-low/15 text-alert-low",
  },
  MEDIUM: {
    label: "Sedang",
    className:
      "border-transparent bg-alert-medium/15 text-alert-medium",
  },
  HIGH: {
    label: "Tinggi",
    className:
      "border-transparent bg-alert-high/15 text-alert-high",
  },
  CRITICAL: {
    label: "Kritis",
    className:
      "border-transparent bg-alert-critical text-white",
  },
}

interface AlertLevelBadgeProps {
  level: AlertLevel
  className?: string
}

export function AlertLevelBadge({
  level,
  className,
}: AlertLevelBadgeProps) {
  const config = alertLevelConfig[level]

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1 font-semibold",
        config.className,
        className,
      )}
    >
      {config.label}
    </Badge>
  )
}