import {
  ArrowLeft,
  Home,
} from "lucide-react"
import {
  useNavigate,
} from "react-router-dom"

import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-primary">
          404
        </p>

        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Halaman tidak ditemukan
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Halaman yang Anda buka belum tersedia
          atau alamatnya tidak valid.
        </p>

        <div className="mt-6 flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="size-4" />
            Kembali
          </Button>

          <Button
            onClick={() =>
              navigate("/", {
                replace: true,
              })
            }
          >
            <Home className="size-4" />
            Beranda
          </Button>
        </div>
      </div>
    </main>
  )
}