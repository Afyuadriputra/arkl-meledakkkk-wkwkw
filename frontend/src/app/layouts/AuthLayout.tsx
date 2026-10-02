import { Outlet } from "react-router-dom"

export function AuthLayout() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/5 to-transparent"
      />

      <div className="relative z-10 w-full">
        <Outlet />
      </div>
    </main>
  )
}