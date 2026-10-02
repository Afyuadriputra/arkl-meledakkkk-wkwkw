import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom"

import { hasStoredToken } from "@/api/tokenStorage"

export function ProtectedRoute() {
  const location = useLocation()

  if (!hasStoredToken()) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    )
  }

  return <Outlet />
}