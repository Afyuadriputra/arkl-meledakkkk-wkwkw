import {
  Bell,
  LogOut,
  Menu,
  UserRound,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AppHeaderProps {
  title: string
  alertsHref?: string
  profileHref?: string
  onLogout?: () => void | Promise<void>
  onOpenMobileMenu?: () => void
}

export function AppHeader({
  title,
  alertsHref,
  profileHref,
  onLogout,
  onOpenMobileMenu,
}: AppHeaderProps) {
  const navigate = useNavigate()

  function handleOpenAlerts() {
    if (!alertsHref) {
      return
    }

    navigate(alertsHref)
  }

  function handleOpenProfile() {
    if (!profileHref) {
      return
    }

    navigate(profileHref)
  }

  async function handleLogout() {
    if (!onLogout) {
      return
    }

    await onLogout()
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="flex h-16 items-center gap-2 px-4 lg:px-8">
        {/* Mobile navigation */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 lg:hidden"
          onClick={onOpenMobileMenu}
          aria-label="Buka navigasi"
        >
          <Menu
            className="size-5"
            aria-hidden="true"
          />
        </Button>

        {/* Workspace title */}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold tracking-tight">
            {title}
          </h2>
        </div>

{/* Header actions */}
<div className="flex shrink-0 items-center gap-2">
  {alertsHref ? (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleOpenAlerts}
      aria-label="Buka peringatan"
      title="Peringatan"
    >
      <Bell
        className="size-5"
        aria-hidden="true"
      />
    </Button>
  ) : null}

  <DropdownMenu>
    <DropdownMenuTrigger
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label="Buka menu akun"
    >
      <UserRound
        className="size-5"
        aria-hidden="true"
      />
    </DropdownMenuTrigger>

    <DropdownMenuContent
      align="end"
      className="w-56"
    >
      <DropdownMenuLabel>
        Akun Saya
      </DropdownMenuLabel>

      {profileHref ? (
        <>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleOpenProfile}
          >
            <UserRound className="size-4" />
            Profil
          </DropdownMenuItem>
        </>
      ) : null}
    </DropdownMenuContent>
  </DropdownMenu>

  {onLogout ? (
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        void handleLogout()
      }}
      className="gap-2 text-destructive hover:text-destructive"
    >
      <LogOut className="size-4" />
      <span className="hidden sm:inline">
        Keluar
      </span>
    </Button>
  ) : null}
</div>
      </div>
    </header>
  )
}