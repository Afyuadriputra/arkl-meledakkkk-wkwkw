import { useState } from "react"
import {
  Outlet,
  useOutletContext,
  useNavigate,
} from "react-router-dom"
import type { WorkerSetupContext } from "@/app/guards/WorkerSetupGuard"
import {
  useQueryClient,
} from "@tanstack/react-query"
import {
  Activity,
  Loader2,
  LogOut,
} from "lucide-react"

import { logout } from "@/api/auth"

import { WorkerBottomNav } from "@/components/navigation/WorkerBottomNav"

import { Button } from "@/components/ui/button"

export function WorkerLayout() {
  const setupContext = useOutletContext<WorkerSetupContext>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [
    isLoggingOut,
    setIsLoggingOut,
  ] = useState(false)

  async function handleLogout() {
    if (isLoggingOut) {
      return
    }

    setIsLoggingOut(true)

    try {
      await logout()
    } finally {
      // Hapus cache data user sebelum kembali ke login.
      queryClient.clear()

      navigate("/login", {
        replace: true,
      })
    }
  }

  return (
    <div
      className="
        min-h-dvh
        bg-muted/20
        pb-[calc(5rem+env(safe-area-inset-bottom))]
      "
    >
      {/* App header */}
      <header
        className="
          sticky
          top-0
          z-30
          border-b
          bg-background/95
          backdrop-blur
          supports-[backdrop-filter]:bg-background/85
        "
      >
        <div
          className="
            mx-auto
            flex
            h-14
            w-full
            max-w-lg
            items-center
            justify-between
            gap-3
            px-4
          "
        >
          {/* Brand */}
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="
                flex
                size-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-primary/10
                text-primary
              "
              aria-hidden="true"
            >
              <Activity className="size-5" />
            </div>

            <div className="min-w-0 leading-tight">
              <p className="truncate text-base font-bold tracking-tight text-primary">
                SMART H₂S
              </p>

              <p className="truncate text-[11px] text-muted-foreground">
                Risiko Pajanan
              </p>
            </div>
          </div>

          {/* Logout */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="
              min-h-10
              shrink-0
              gap-2
              px-3
              text-muted-foreground
              hover:bg-destructive/10
              hover:text-destructive
            "
            disabled={isLoggingOut}
            aria-busy={isLoggingOut}
            onClick={() => {
              void handleLogout()
            }}
          >
            {isLoggingOut ? (
              <Loader2
                className="size-4 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <LogOut
                className="size-4"
                aria-hidden="true"
              />
            )}

            <span>
              {isLoggingOut
                ? "Keluar..."
                : "Keluar"}
            </span>
          </Button>
        </div>
      </header>

      {/* Page content */}
      <main
        className="
          mx-auto
          w-full
          max-w-lg
        "
        aria-busy={isLoggingOut}
      >
        <Outlet context={setupContext} />
      </main>

      {/* Primary navigation */}
      <WorkerBottomNav />
    </div>
  )
}
