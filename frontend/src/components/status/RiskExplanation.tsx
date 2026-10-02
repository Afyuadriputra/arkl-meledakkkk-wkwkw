import {
  CircleCheck,
  TriangleAlert,
} from "lucide-react"

import type {
  RiskInterpretation,
} from "@/components/status/RiskBadge"

type RiskExplanationProps = {
  interpretation: RiskInterpretation
}

const explanations = {
  WITHIN_REFERENCE_LEVEL: {
    title: "RQ ≤ 1 — AMAN",
    description: "Nilai RQ saat ini masih berada AMAN yang digunakan sistem. Tetap ikuti pemantauan H₂S dan arahan petugas.",
    icon: CircleCheck,
    className: "bg-status-normal/10 text-status-normal",
  },
  ABOVE_REFERENCE_LEVEL: {
    title: "RQ > 1 — BAHAYA",
    description: "Nilai RQ saat ini berad a BAHAYA yang digunakan sistem. Perhatikan peringatan dan ikuti arahan petugas untuk mengurangi pajanan.",
    icon: TriangleAlert,
    className: "bg-status-warning/10 text-status-warning",
  },
} satisfies Record<
  RiskInterpretation,
  {
    title: string
    description: string
    icon: typeof CircleCheck
    className: string
  }
>

export function RiskExplanation({
  interpretation,
}: RiskExplanationProps) {
  const explanation = explanations[interpretation]
  const Icon = explanation.icon

  return (
    <div className="flex gap-3">
      <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${explanation.className}`}>
        <Icon className="size-5" />
      </div>

      <div>
        <p className="font-semibold">
          {explanation.title}
        </p>

        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {explanation.description}
        </p>

        <p className="mt-2 text-xs text-muted-foreground">
          RQ adalah karakterisasi risiko pajanan lingkungan, bukan diagnosis penyakit.
        </p>
      </div>
    </div>
  )
}
