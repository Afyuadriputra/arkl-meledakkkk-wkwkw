import { NavLink } from "react-router-dom"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

type NavigationItem = {
  label: string
  href?: string
  icon?: LucideIcon
  items?: NavigationItem[]
}

interface MobileAppDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  navigation: NavigationItem[]
  title?: string
  subtitle?: string
}

export function MobileAppDrawer({
  open,
  onOpenChange,
  navigation,
  title = "SMART H₂S",
  subtitle = "Sistem Pemantauan ARKL",
}: MobileAppDrawerProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
    >
      <SheetContent
        side="left"
        className="w-[88vw] max-w-sm p-0"
      >
        <SheetHeader className="border-b px-5 py-5 text-left">
          <SheetTitle className="text-lg font-bold text-primary">
            {title}
          </SheetTitle>

          <SheetDescription>
            {subtitle}
          </SheetDescription>
        </SheetHeader>

        <nav className="h-[calc(100vh-88px)] overflow-y-auto px-3 py-4">
          <div className="space-y-5">
            {navigation.map((group) => {
              if (group.href) {
                const Icon = group.icon

                return (
                  <NavLink
                    key={group.href}
                    to={group.href}
                    onClick={() =>
                      onOpenChange(false)
                    }
                    className={({ isActive }) =>
                      cn(
                        "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
                      )
                    }
                  >
                    {Icon ? (
                      <Icon className="size-5" />
                    ) : null}

                    {group.label}
                  </NavLink>
                )
              }

              return (
                <section key={group.label}>
                  <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </p>

                  <div className="space-y-1">
                    {group.items?.map((item) => {
                      if (!item.href) {
                        return null
                      }

                      const Icon = item.icon

                      return (
                        <NavLink
                          key={item.href}
                          to={item.href}
                          onClick={() =>
                            onOpenChange(false)
                          }
                          className={({ isActive }) =>
                            cn(
                              "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                              isActive
                                ? "bg-accent text-accent-foreground"
                                : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
                            )
                          }
                        >
                          {Icon ? (
                            <Icon className="size-5" />
                          ) : null}

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
      </SheetContent>
    </Sheet>
  )
}