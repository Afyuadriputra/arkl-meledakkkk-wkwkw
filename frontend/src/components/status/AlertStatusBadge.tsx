import {
  CheckCircle2,
  CircleDot,
  Clock3,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type AlertStatus =
  | "OPEN"
  | "ACKNOWLEDGED"
  | "RESOLVED"

const alertStatusConfig = {
  OPEN: {
    label: "Aktif",
    icon: CircleDot,
    className:
      "border-status-danger/20 bg-status-danger/10 text-status-danger",
  },
  ACKNOWLEDGED: {
    label: "Sudah Ditanggapi",
    icon: Clock3,
    className:
      "border-status-warning/20 bg-status-warning/10 text-status-warning",
  },
  RESOLVED: {
    label: "Selesai",
    icon: CheckCircle2,
    className:
      "border-status-normal/20 bg-status-normal/10 text-status-normal",
  },
} satisfies Record<
  AlertStatus,
  {
    label: string
    icon: typeof CircleDot
    className: string
  }
>

interface AlertStatusBadgeProps {
  status: AlertStatus
  className?: string
}

export function AlertStatusBadge({
  status,
  className,
}: AlertStatusBadgeProps) {
  const config = alertStatusConfig[status]
  const Icon = config.icon

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 rounded-full px-2.5 py-1 font-medium",
        config.className,
        className,
      )}
    >
      <Icon className="size-3.5" />
      {config.label}
    </Badge>
  )
}