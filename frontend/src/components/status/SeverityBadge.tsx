import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type Severity =
  | "NORMAL"
  | "CAUTION"
  | "WARNING"
  | "DANGER"
  | "CRITICAL"

const severityConfig: Record<
  Severity,
  {
    label: string
    className: string
  }
> = {
  NORMAL: {
    label: "Normal",
    className:
      "border-transparent bg-status-normal/10 text-status-normal",
  },
  CAUTION: {
    label: "Waspada",
    className:
      "border-transparent bg-status-caution/10 text-status-caution",
  },
  WARNING: {
    label: "Peringatan",
    className:
      "border-transparent bg-status-warning/10 text-status-warning",
  },
  DANGER: {
    label: "Bahaya",
    className:
      "border-transparent bg-status-danger/10 text-status-danger",
  },
  CRITICAL: {
    label: "Kritis",
    className:
      "border-transparent bg-status-critical text-white",
  },
}

interface SeverityBadgeProps {
  severity: Severity
  className?: string
}

export function SeverityBadge({
  severity,
  className,
}: SeverityBadgeProps) {
  const config = severityConfig[severity]

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