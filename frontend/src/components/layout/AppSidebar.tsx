import { NavLink } from "react-router-dom"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type NavigationItem = {
  label: string
  href?: string
  icon?: LucideIcon
  items?: NavigationItem[]
}

interface AppSidebarProps {
  navigation: NavigationItem[]
  title?: string
  subtitle?: string
}

export function AppSidebar({
  navigation,
  title = "SMART H₂S",
  subtitle = "Sistem Pemantauan ARKL",
}: AppSidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-72 border-r bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
      <div className="border-b px-6 py-6">
        <h1 className="text-xl font-bold tracking-tight text-sidebar-primary">
          {title}
        </h1>

        <p className="mt-1 text-xs text-sidebar-foreground/70">
          {subtitle}
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-6">
          {navigation.map((group) => {
            if (group.href) {
              const Icon = group.icon

              return (
                <NavLink
                  key={group.href}
                  to={group.href}
                  className={({ isActive }) =>
                    cn(
                      "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    )
                  }
                >
                  {Icon ? <Icon className="size-5" /> : null}
                  {group.label}
                </NavLink>
              )
            }

            return (
              <section key={group.label}>
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  {group.label}
                </p>

                <div className="space-y-1">
                  {group.items?.map((item) => {
                    if (!item.href) return null

                    const Icon = item.icon

                    return (
                      <NavLink
                        key={item.href}
                        to={item.href}
                        className={({ isActive }) =>
                          cn(
                            "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                          )
                        }
                      >
                        {Icon ? <Icon className="size-5" /> : null}
                        {item.label}
                      </NavLink>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}