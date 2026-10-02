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
  researchNavigation,
} from "@/app/navigation"

import { AppHeader } from "@/components/layout/AppHeader"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { MobileAppDrawer } from "@/components/navigation/MobileAppDrawer"

export function ResearchLayout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [
    mobileNavigationOpen,
    setMobileNavigationOpen,
  ] = useState(false)

  async function handleLogout() {
    try {
      await logout()
    } finally {
      queryClient.clear()

      navigate("/login", {
        replace: true,
      })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        navigation={researchNavigation}
        subtitle="Workspace Penelitian"
      />

      <MobileAppDrawer
        open={mobileNavigationOpen}
        onOpenChange={
          setMobileNavigationOpen
        }
        navigation={researchNavigation}
        subtitle="Workspace Penelitian"
      />

      <div className="min-h-screen lg:pl-72">
        <AppHeader
          title="Penelitian"
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