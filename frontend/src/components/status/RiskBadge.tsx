import {
  CircleCheck,
  TriangleAlert,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type RiskInterpretation =
  | "WITHIN_REFERENCE_LEVEL"
  | "ABOVE_REFERENCE_LEVEL"

const riskConfig = {
  WITHIN_REFERENCE_LEVEL: {
    label: "Dalam Batas Referensi",
    icon: CircleCheck,
    className:
      "border-status-normal/20 bg-status-normal/10 text-status-normal",
  },
  ABOVE_REFERENCE_LEVEL: {
    label: "Di Atas Batas Referensi",
    icon: TriangleAlert,
    className:
      "border-status-danger/20 bg-status-danger/10 text-status-danger",
  },
} satisfies Record<
  RiskInterpretation,
  {
    label: string
    icon: typeof CircleCheck
    className: string
  }
>

interface RiskBadgeProps {
  interpretation: RiskInterpretation
  className?: string
}

export function RiskBadge({
  interpretation,
  className,
}: RiskBadgeProps) {
  const config = riskConfig[interpretation]
  const Icon = config.icon

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 rounded-full px-2.5 py-1 font-semibold",
        config.className,
        className,
      )}
    >
      <Icon className="size-3.5" />
      {config.label}
    </Badge>
  )
}