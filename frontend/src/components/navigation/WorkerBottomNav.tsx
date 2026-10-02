import {
  NavLink,
} from "react-router-dom"

import {
  workerNavigation,
} from "@/app/navigation"

import {
  cn,
} from "@/lib/utils"

export function WorkerBottomNav() {
  return (
    <nav
      aria-label="Navigasi utama Worker"
      className="
        fixed
        inset-x-0
        bottom-0
        z-40
        border-t
        bg-background/95
        backdrop-blur
        supports-[backdrop-filter]:bg-background/85
      "
    >
      <div
        className="
          mx-auto
          grid
          h-16
          w-full
          max-w-lg
          px-1
        "
        style={{
          gridTemplateColumns:
            `repeat(${workerNavigation.length}, minmax(0, 1fr))`,
        }}
      >
        {workerNavigation.map(
          (item) => {
            const Icon =
              item.icon

            return (
              <NavLink
                key={item.href}
                to={item.href}
                aria-label={item.label}
                className={({
                  isActive,
                }) =>
                  cn(
                    `
                      group
                      relative
                      flex
                      min-w-0
                      flex-col
                      items-center
                      justify-center
                      gap-1
                      rounded-xl
                      px-1
                      text-[11px]
                      font-medium
                      transition-colors
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-inset
                      focus-visible:ring-ring
                    `,
                    isActive
                      ? "text-primary"
                      : `
                        text-muted-foreground
                        hover:text-foreground
                      `,
                  )
                }
              >
                {({
                  isActive,
                }) => (
                  <>
                    <span
                      className={cn(
                        `
                          flex
                          h-8
                          min-w-10
                          items-center
                          justify-center
                          rounded-xl
                          transition-colors
                        `,
                        isActive
                          ? "bg-primary/10"
                          : `
                            bg-transparent
                            group-hover:bg-muted
                          `,
                      )}
                    >
                      <Icon
                        className="size-5"
                        strokeWidth={
                          isActive
                            ? 2.25
                            : 1.9
                        }
                        aria-hidden="true"
                      />
                    </span>

                    <span className="max-w-full truncate">
                      {item.label}
                    </span>

                    {isActive ? (
                      <span
                        className="
                          absolute
                          bottom-0
                          h-0.5
                          w-7
                          rounded-full
                          bg-primary
                        "
                        aria-hidden="true"
                      />
                    ) : null}
                  </>
                )}
              </NavLink>
            )
          },
        )}
      </div>

      <div
        className="h-[env(safe-area-inset-bottom)]"
        aria-hidden="true"
      />
    </nav>
  )
}