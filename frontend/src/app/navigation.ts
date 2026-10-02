import type {
  LucideIcon,
} from "lucide-react"

import {
  Activity,
  Bell,
  ChartNoAxesCombined,
  Gauge,
  RadioTower,
  UserRound,
  Users,
} from "lucide-react"


type NavigationItem = {
  label: string
  href: string
  icon: LucideIcon
}


type NavigationGroup = {
  label: string
  items: NavigationItem[]
}


export const operationalNavigation: (
  | NavigationItem
  | NavigationGroup
)[] = [
  {
    label: "Dasbor",
    href: "/app/dashboard",
    icon: Gauge,
  },
  {
    label: "Pemantauan",
    items: [
      {
        label: "H₂S Langsung",
        href: "/app/monitoring",
        icon: Activity,
      },
      {
        label: "Perangkat",
        href: "/app/devices",
        icon: RadioTower,
      },
    ],
  },
  {
    label: "Risiko",
    items: [
      {
        label: "Pemulung",
        href: "/app/workers",
        icon: Users,
      },
      {
        label: "ARKL",
        href: "/app/arkl",
        icon: ChartNoAxesCombined,
      },
      {
        label: "Peringatan",
        href: "/app/alerts",
        icon: Bell,
      },
    ],
  },
]


export const researchNavigation:
NavigationItem[] = [
  {
    label: "Ringkasan",
    href: "/research/dashboard",
    icon: Gauge,
  },
  {
    label: "Data ARKL",
    href: "/research/arkl",
    icon: ChartNoAxesCombined,
  },
]


export const workerNavigation:
NavigationItem[] = [
  {
    label: "Beranda",
    href: "/worker/home",
    icon: Gauge,
  },
  {
    label: "Monitoring",
    href: "/worker/monitoring",
    icon: Activity,
  },
  {
    label: "Risiko",
    href: "/worker/risk",
    icon: ChartNoAxesCombined,
  },
  {
    label: "Peringatan",
    href: "/worker/alerts",
    icon: Bell,
  },
  {
    label: "Profil",
    href: "/worker/profile",
    icon: UserRound,
  },
]


export const systemNavigation:
NavigationItem[] = []