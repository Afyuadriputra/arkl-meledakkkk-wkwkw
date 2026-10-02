import {
  Navigate,
  Outlet,
} from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"

import { getCurrentUser } from "@/api/auth"

type UserRole =
  | "ADMIN"
  | "OPERATOR"
  | "RESEARCHER"
  | "WORKER"

interface RoleRouteProps {
  allowedRoles: UserRole[]
}

function getDefaultRoute(role: UserRole) {
  switch (role) {
    case "ADMIN":
    case "OPERATOR":
      return "/app/dashboard"

    case "RESEARCHER":
      return "/research/dashboard"

    case "WORKER":
      return "/worker/home"
  }
}

export function RoleRoute({
  allowedRoles,
}: RoleRouteProps) {
  const currentUserQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    staleTime: 60_000,
    retry: false,
  })

  if (currentUserQuery.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-primary" />

          <p className="text-sm">
            Memuat akses akun...
          </p>
        </div>
      </div>
    )
  }

  if (
    currentUserQuery.isError ||
    !currentUserQuery.data
  ) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  const role = currentUserQuery.data.role as UserRole

  if (!allowedRoles.includes(role)) {
    return (
      <Navigate
        to={getDefaultRoute(role)}
        replace
      />
    )
  }

  return <Outlet />
}