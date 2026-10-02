import {
  CircleDot,
  Clock3,
  WifiOff,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type FreshnessState =
  | "LIVE"
  | "DELAYED"
  | "STALE"

const freshnessConfig = {
  LIVE: {
    label: "Langsung",
    icon: CircleDot,
    className:
      "border-status-normal/20 bg-status-normal/10 text-status-normal",
  },
  DELAYED: {
    label: "Terlambat",
    icon: Clock3,
    className:
      "border-status-warning/20 bg-status-warning/10 text-status-warning",
  },
  STALE: {
    label: "Tidak Ada Data Terbaru",
    icon: WifiOff,
    className:
      "border-muted bg-muted text-muted-foreground",
  },
} satisfies Record<
  FreshnessState,
  {
    label: string
    icon: typeof CircleDot
    className: string
  }
>

interface FreshnessBadgeProps {
  state: FreshnessState
  className?: string
}

export function FreshnessBadge({
  state,
  className,
}: FreshnessBadgeProps) {
  const config = freshnessConfig[state]
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
      <Icon
        className={cn(
          "size-3.5",
          state === "LIVE" && "live-dot",
        )}
      />

      {config.label}
    </Badge>
  )
}