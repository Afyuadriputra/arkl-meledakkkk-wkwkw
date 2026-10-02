import { useState } from "react"
import {
  Outlet,
  useNavigate,
} from "react-router-dom"
import {
  useQueryClient,
} from "@tanstack/react-query"

import { logout } from "@/api/auth"

import {
  operationalNavigation,
} from "@/app/navigation"

import { AppHeader } from "@/components/layout/AppHeader"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { MobileAppDrawer } from "@/components/navigation/MobileAppDrawer"

export function OperationalLayout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [
    mobileNavigationOpen,
    setMobileNavigationOpen,
  ] = useState(false)

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
      queryClient.clear()

      navigate("/login", {
        replace: true,
      })

      setIsLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        navigation={operationalNavigation}
        subtitle="Workspace Operasional"
      />

      <MobileAppDrawer
        open={mobileNavigationOpen}
        onOpenChange={
          setMobileNavigationOpen
        }
        navigation={operationalNavigation}
        subtitle="Workspace Operasional"
      />

      <div className="min-h-screen lg:pl-72">
        <AppHeader
          title="SMART H₂S"
          onLogout={handleLogout}
          onOpenMobileMenu={() =>
            setMobileNavigationOpen(true)
          }
        />

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}