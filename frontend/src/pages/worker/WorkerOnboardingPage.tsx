import {
  type FormEvent,
  useState,
} from "react"
import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import {
  Check,
  Circle,
  Clock3,
  Loader2,
  RefreshCw,
  Save,
  UserRound,
} from "lucide-react"
import {
  useNavigate,
  useOutletContext,
} from "react-router-dom"
import {
  toast,
} from "sonner"

import {
  logout,
} from "@/api/auth"
import {
  updateMyProfile,
} from "@/api/worker"

import type {
  WorkerSetupContext,
} from "@/app/guards/WorkerSetupGuard"
import { WorkerExposureForm } from "@/pages/worker/WorkerExposurePage"

import {
  Badge,
} from "@/components/ui/badge"
import {
  Button,
} from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Input,
} from "@/components/ui/input"
import {
  Label,
} from "@/components/ui/label"


type WorkerProfile =
  WorkerSetupContext["profile"]


interface OnboardingProfileFormProps {
  profile: WorkerProfile
}


function OnboardingProfileForm({
  profile,
}: OnboardingProfileFormProps) {
  const queryClient =
    useQueryClient()

  const [
    name,
    setName,
  ] =
    useState(
      () =>
        profile?.name ?? "",
    )

  const [
    age,
    setAge,
  ] =
    useState(
      () =>
        typeof profile?.age ===
        "number"
          ? String(
              profile.age,
            )
          : "",
    )


  const updateProfileMutation =
    useMutation({
      mutationFn:
        updateMyProfile,

      onSuccess:
        async (saved) => {
          queryClient.setQueryData(["worker", "profile"], saved)
          await queryClient
            .invalidateQueries({
              queryKey: [
                "worker",
                "profile",
              ],
            })

          toast.success(
            "Data diri berhasil disimpan.",
          )
        },

      onError: () => {
        toast.error(
          "Data diri belum berhasil disimpan.",
        )
      },
    })


  const ageNumber =
    Number(age)

  const validName =
    name.trim().length > 0

  const validAge =
    Number.isInteger(
      ageNumber,
    ) &&
    ageNumber >= 1 &&
    ageNumber <= 120

  const canSaveProfile =
    validName &&
    validAge &&
    !updateProfileMutation
      .isPending


  function handleSubmitProfile(
    event:
      FormEvent<
        HTMLFormElement
      >,
  ) {
    event.preventDefault()

    if (!canSaveProfile) {
      return
    }

    updateProfileMutation
      .mutate({
        name:
          name.trim(),

        age:
          ageNumber,
      })
  }


  return (
    <form
      className="space-y-5"
      onSubmit={
        handleSubmitProfile
      }
    >
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="onboarding-name">
          Nama
        </Label>

        <Input
          id="onboarding-name"
          name="name"
          value={name}
          autoComplete="name"
          placeholder="Masukkan nama"
          className="min-h-11"
          disabled={
            updateProfileMutation
              .isPending
          }
          onChange={(
            event,
          ) =>
            setName(
              event.target
                .value,
            )
          }
        />

        {name.length > 0 &&
        !validName ? (
          <p className="text-xs text-destructive">
            Nama tidak boleh kosong.
          </p>
        ) : null}
      </div>


      {/* Age */}
      <div className="space-y-2">
        <Label htmlFor="onboarding-age">
          Usia
        </Label>

        <Input
          id="onboarding-age"
          name="age"
          type="number"
          min={1}
          max={120}
          inputMode="numeric"
          value={age}
          autoComplete="off"
          placeholder="Contoh: 35"
          className="min-h-11"
          disabled={
            updateProfileMutation
              .isPending
          }
          onChange={(
            event,
          ) =>
            setAge(
              event.target
                .value,
            )
          }
        />

        {age.length > 0 &&
        !validAge ? (
          <p className="text-xs text-destructive">
            Usia harus antara
            1 sampai 120 tahun.
          </p>
        ) : null}
      </div>


      <Button
        type="submit"
        className="
          min-h-11
          w-full
          gap-2
          font-semibold
        "
        disabled={
          !canSaveProfile
        }
      >
        {updateProfileMutation
          .isPending ? (
          <>
            <Loader2
              className="
                size-4
                animate-spin
              "
              aria-hidden="true"
            />

            Menyimpan...
          </>
        ) : (
          <>
            <Save
              className="size-4"
              aria-hidden="true"
            />

            Simpan Data Diri
          </>
        )}
      </Button>
    </form>
  )
}


export function WorkerOnboardingPage() {
  const navigate =
    useNavigate()

  const queryClient =
    useQueryClient()

  const {
    profile,
    exposure,
    profileComplete,
    exposureComplete,
    exposureMissing,
  } =
    useOutletContext<
      WorkerSetupContext
    >()


  const [
    checkingStatus,
    setCheckingStatus,
  ] =
    useState(false)


  const logoutMutation =
    useMutation({
      mutationFn:
        logout,

      onSuccess: () => {
        /*
         * Jangan membawa cache Worker
         * ke sesi pengguna berikutnya.
         */
        queryClient.clear()

        navigate(
          "/login",
          {
            replace: true,
          },
        )
      },

      onError: () => {
        toast.error(
          "Belum dapat keluar. Silakan coba kembali.",
        )
      },
    })


  async function handleCheckStatus() {
    if (checkingStatus) {
      return
    }

    setCheckingStatus(true)

    try {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["worker", "profile"], exact: true }),
        queryClient.refetchQueries({ queryKey: ["worker", "exposure"], exact: true }),
      ])
    } finally {
      setCheckingStatus(false)
    }
  }


  return (
    <main
      className="
        mx-auto
        w-full
        max-w-xl
        space-y-5
        p-4
        pb-8
        sm:p-6
      "
    >
      {/* Header */}
      <header>
        <Badge
          variant="outline"
          className="rounded-full"
        >
          Pengaturan Awal
        </Badge>

        <h1
          className="
            mt-3
            text-2xl
            font-bold
            tracking-tight
          "
        >
          Siapkan Data Anda
        </h1>

        <p
          className="
            mt-1
            max-w-md
            text-sm
            leading-relaxed
            text-muted-foreground
          "
        >
          Selesaikan data dasar agar
          informasi kondisi kerja dapat
          digunakan dengan benar.
        </p>
      </header>


      {/* Progress */}
      <Card
        className="
          overflow-hidden
          border-primary/15
          shadow-sm
        "
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Status Pengaturan
          </CardTitle>

          <CardDescription>
            Dua langkah diperlukan sebelum
            akun siap digunakan.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div
            className="
              relative
              grid
              grid-cols-2
              gap-4
            "
          >
            <div
              className="
                absolute
                left-1/4
                right-1/4
                top-5
                h-0.5
                bg-border
              "
              aria-hidden="true"
            />

            <div
              className="
                relative
                z-10
                flex
                flex-col
                items-center
                text-center
              "
            >
              <span
                className={
                  profileComplete
                    ? `
                      flex
                      size-10
                      items-center
                      justify-center
                      rounded-full
                      bg-primary
                      text-primary-foreground
                      shadow-sm
                    `
                    : `
                      flex
                      size-10
                      items-center
                      justify-center
                      rounded-full
                      border-2
                      bg-background
                      text-muted-foreground
                    `
                }
              >
                {profileComplete ? (
                  <Check
                    className="size-5"
                    aria-hidden="true"
                  />
                ) : (
                  <UserRound
                    className="size-5"
                    aria-hidden="true"
                  />
                )}
              </span>

              <p className="mt-2 text-sm font-semibold">
                Data Diri
              </p>

              <p
                className="
                  mt-0.5
                  text-xs
                  text-muted-foreground
                "
              >
                {profileComplete
                  ? "Sudah lengkap"
                  : "Perlu dilengkapi"}
              </p>
            </div>


            <div
              className="
                relative
                z-10
                flex
                flex-col
                items-center
                text-center
              "
            >
              <span
                className={
                  exposureComplete
                    ? `
                      flex
                      size-10
                      items-center
                      justify-center
                      rounded-full
                      bg-primary
                      text-primary-foreground
                      shadow-sm
                    `
                    : `
                      flex
                      size-10
                      items-center
                      justify-center
                      rounded-full
                      border-2
                      bg-background
                      text-muted-foreground
                    `
                }
              >
                {exposureComplete ? (
                  <Check
                    className="size-5"
                    aria-hidden="true"
                  />
                ) : exposureMissing ? (
                  <Clock3
                    className="size-5"
                    aria-hidden="true"
                  />
                ) : (
                  <Circle
                    className="size-5"
                    aria-hidden="true"
                  />
                )}
              </span>

              <p className="mt-2 text-sm font-semibold">
                Data Pajanan
              </p>

              <p
                className="
                  mt-0.5
                  text-xs
                  text-muted-foreground
                "
              >
                {exposureComplete
                  ? "Sudah lengkap"
                  : exposureMissing
                    ? "Isi data pajanan"
                    : "Perlu dilengkapi"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Profile form */}
      {!profileComplete ? (
        <Card>
          <CardHeader>
            <div
              className="
                flex
                items-start
                gap-3
              "
            >
              <div
                className="
                  flex
                  size-11
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-primary/10
                  text-primary
                "
              >
                <UserRound
                  className="size-5"
                  aria-hidden="true"
                />
              </div>

              <div>
                <CardTitle className="text-base">
                  Langkah 1 · Data Diri
                </CardTitle>

                <CardDescription className="mt-1">
                  Lengkapi nama dan usia Anda.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <OnboardingProfileForm
              key={profile?.id ?? "empty-profile"}
              profile={
                profile
              }
            />
          </CardContent>
        </Card>
      ) : null}


      {/* Profile completed */}
      {profileComplete ? (
        <div
          className="
            flex
            items-center
            gap-3
            rounded-2xl
            border
            border-primary/15
            bg-primary/5
            p-4
          "
        >
          <span
            className="
              flex
              size-10
              shrink-0
              items-center
              justify-center
              rounded-full
              bg-primary
              text-primary-foreground
            "
          >
            <Check
              className="size-5"
              aria-hidden="true"
            />
          </span>

          <div className="min-w-0">
            <p className="text-sm font-semibold">
              Data diri sudah siap
            </p>

            <p
              className="
                mt-0.5
                text-xs
                text-muted-foreground
              "
            >
              Nama dan usia Anda sudah tercatat.
            </p>
          </div>
        </div>
      ) : null}


      {profileComplete && !exposureComplete ? (
        <section className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Langkah 2 · Isi data pajanan Anda. Setelah disimpan, Anda bisa
            membuka dashboard sambil menunggu persetujuan petugas.
          </p>
          <WorkerExposureForm
            key={exposure?.id ?? "new-exposure"}
            exposure={exposure ?? null}
          />
          <Button type="button" variant="outline" className="min-h-11 w-full"
            disabled={checkingStatus} onClick={handleCheckStatus}>
            <RefreshCw className={checkingStatus ? "size-4 animate-spin" : "size-4"} />
            Periksa Status
          </Button>
          <Button type="button" variant="ghost" className="min-h-11 w-full"
            disabled={logoutMutation.isPending} onClick={() => logoutMutation.mutate()}>
            Keluar dari Akun
          </Button>
        </section>
      ) : null}
    </main>
  )
}
