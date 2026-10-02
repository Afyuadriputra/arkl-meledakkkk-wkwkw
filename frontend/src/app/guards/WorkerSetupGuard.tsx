import {
  useMemo,
} from "react"
import {
  useQuery,
} from "@tanstack/react-query"

import {
  Navigate,
  Link,
  Outlet,
  useLocation,
} from "react-router-dom"
import {
  RefreshCw,
  TriangleAlert,
} from "lucide-react"

import {
  getMyExposureForSetup,
  getMyProfile,
} from "@/api/worker"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  Button,
} from "@/components/ui/button"
import {
  Skeleton,
} from "@/components/ui/skeleton"

export type WorkerSetupContext = {
  profile:
    | Awaited<
        ReturnType<
          typeof getMyProfile
        >
      >
    | undefined

  exposure:
    | Awaited<
        ReturnType<
          typeof getMyExposureForSetup
        >
      >
    | undefined

  profileComplete: boolean
  exposureComplete: boolean
  exposureMissing: boolean
}

function isProfileComplete(
  profile:
    | Awaited<
        ReturnType<
          typeof getMyProfile
        >
      >
    | undefined,
) {
  if (!profile) {
    return false
  }

  const name =
    typeof profile.name === "string"
      ? profile.name.trim()
      : ""

  const age =
    profile.age

  return (
    name.length > 0 &&
    typeof age === "number" &&
    Number.isInteger(age) &&
    age >= 1 &&
    age <= 120
  )
}

function isExposureComplete(
  exposure:
    | Awaited<
        ReturnType<
          typeof getMyExposureForSetup
        >
      >
    | undefined,
) {
  if (!exposure) {
    return false
  }

  return (
    Number.isFinite(
      exposure.body_weight,
    ) &&
    exposure.body_weight > 0 &&
    Number.isFinite(
      exposure.exposure_time,
    ) &&
    exposure.exposure_time > 0 &&
    exposure.exposure_time <= 24 &&
    Number.isFinite(
      exposure.exposure_frequency,
    ) &&
    exposure.exposure_frequency > 0 &&
    exposure.exposure_frequency <= 365 &&
    Number.isFinite(
      exposure.exposure_duration,
    ) &&
    exposure.exposure_duration > 0
  )
}

function GuardSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  )
}

export function WorkerSetupGuard() {
  const location =
    useLocation()

  const isOnboarding =
    location.pathname === "/worker/onboarding"

  const profileQuery =
    useQuery({
      queryKey: [
        "worker",
        "profile",
      ],
      queryFn:
        getMyProfile,

      staleTime: 60_000,
      retry: false,
      retryOnMount: false,

      refetchOnWindowFocus: !isOnboarding,
      refetchOnReconnect: !isOnboarding,
      refetchInterval: isOnboarding ? false : 15_000,
    })

  const exposureQuery =
    useQuery({
      queryKey: [
        "worker",
        "exposure",
      ],
      queryFn:
        getMyExposureForSetup,

      staleTime: 60_000,
      retry: false,
      retryOnMount: false,

      refetchOnWindowFocus: !isOnboarding,
      refetchOnReconnect: !isOnboarding,
      refetchInterval: isOnboarding ? false : 15_000,
    })

  const exposureMissing =
    exposureQuery.data === null

  const hasRealError =
    (profileQuery.isError && profileQuery.data === undefined) ||
    (exposureQuery.isError && exposureQuery.data === undefined)

  const isLoading =
    profileQuery.isPending ||
    exposureQuery.isPending

  const profileComplete =
    useMemo(
      () =>
        isProfileComplete(
          profileQuery.data,
        ),
      [profileQuery.data],
    )

  const exposureComplete =
    useMemo(
      () =>
        isExposureComplete(
          exposureQuery.data,
        ),
      [exposureQuery.data],
    )

  const setupComplete =
    profileComplete &&
    exposureComplete

  const outletContext:
    WorkerSetupContext = {
      profile:
        profileQuery.data,

      exposure:
        exposureQuery.data,

      profileComplete,
      exposureComplete,
      exposureMissing,
    }

  if (isLoading) {
    return (
      <GuardSkeleton />
    )
  }

  /*
   * 404 Exposure adalah state setup,
   * bukan error sistem.
   */
  if (hasRealError) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <TriangleAlert className="size-4" />

          <AlertTitle>
            Data tidak dapat dimuat
          </AlertTitle>

          <AlertDescription>
            Terjadi gangguan saat mengambil
            data Anda. Silakan coba kembali.
          </AlertDescription>

          <Button
            type="button"
            variant="outline"
            className="mt-4 min-h-11 gap-2"
            disabled={
              profileQuery.isFetching ||
              exposureQuery.isFetching
            }
            onClick={() => {
              void profileQuery.refetch()
              void exposureQuery.refetch()
            }}
          >
            <RefreshCw
              className={
                profileQuery.isFetching ||
                exposureQuery.isFetching
                  ? "size-4 animate-spin"
                  : "size-4"
              }
            />

            Coba Lagi
          </Button>
        </Alert>
      </div>
    )
  }

  /*
   * Setup belum lengkap.
   * Semua route Worker diarahkan
   * ke onboarding.
   */
  if (!setupComplete) {
    if (!isOnboarding) {
      return (
        <Navigate
          to="/worker/onboarding"
          replace
        />
      )
    }

    return (
      <Outlet
        context={
          outletContext
        }
      />
    )
  }

  /*
   * Setup sudah lengkap.
   * Worker tidak perlu kembali
   * ke onboarding.
   */
  if (isOnboarding) {
    return (
      <Navigate
        to="/worker/home"
        replace
      />
    )
  }

  return (
    <>
      {exposureQuery.data?.approval_status !== "APPROVED" ? (
        <div role="status" className="mx-auto max-w-xl px-4 pt-4">
          <Alert>
            <AlertTitle>
              {exposureQuery.data?.approval_status === "REJECTED" ? "Data pajanan perlu diperbaiki" : "Profil pajanan belum diverifikasi"}
            </AlertTitle>
            <AlertDescription>
              {exposureQuery.data?.approval_status === "REJECTED"
                ? "Monitoring tetap tersedia, tetapi kalkulasi baru dihentikan sampai data diperbaiki dan disimpan kembali."
                : "ARKL dapat dihitung otomatis dari perangkat IoT yang terhubung, dengan label hasil sementara sampai profil diverifikasi petugas."}
              {" "}Hasil sebelumnya tetap merupakan riwayat dengan status verifikasi saat dihitung.
              {exposureQuery.data?.review_note ? ` Catatan petugas: ${exposureQuery.data.review_note}` : ""}
              <Link to="/worker/profile/exposure" className="mt-2 block font-medium underline">
                Lihat atau perbaiki data pajanan
              </Link>
            </AlertDescription>
          </Alert>
        </div>
      ) : null}
      <Outlet context={outletContext} />
    </>
  )
}
