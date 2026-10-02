import {
  useState,
} from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import {
  ArrowRight,
  BadgeCheck,
  Loader2,
  Save,
  Scale,
  TriangleAlert,
  UserRound,
} from "lucide-react"
import {
  useNavigate,
} from "react-router-dom"
import {
  toast,
} from "sonner"

import {
  getMyProfile,
  updateMyProfile,
} from "@/api/worker"

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert"
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
import {
  Skeleton,
} from "@/components/ui/skeleton"


type WorkerProfile =
  Awaited<
    ReturnType<
      typeof getMyProfile
    >
  >


interface WorkerProfileFormProps {
  profile: WorkerProfile
}


function WorkerProfileSkeleton() {
  return (
    <div className="space-y-5 p-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>

      <Skeleton className="h-44 rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  )
}


function WorkerProfileForm({
  profile,
}: WorkerProfileFormProps) {
  const queryClient =
    useQueryClient()

  const [
    name,
    setName,
  ] =
    useState(
      () =>
        profile.name ?? "",
    )

  const [
    age,
    setAge,
  ] =
    useState(
      () =>
        typeof profile.age ===
        "number"
          ? String(
              profile.age,
            )
          : "",
    )


  const updateMutation =
    useMutation({
      mutationFn:
        updateMyProfile,

      onSuccess:
        async () => {
          await queryClient.invalidateQueries({
            queryKey: [
              "worker",
              "profile",
            ],
          })

          toast.success(
            "Profil berhasil diperbarui.",
          )
        },

      onError: () => {
        toast.error(
          "Profil belum berhasil diperbarui.",
        )
      },
    })


  const ageNumber =
    Number(age)

  const validAge =
    Number.isInteger(
      ageNumber,
    ) &&
    ageNumber >= 1 &&
    ageNumber <= 120

  const validName =
    name.trim().length > 0

  const hasChanges =
    name.trim() !==
      (
        profile.name ??
        ""
      ).trim() ||
    age !==
      (
        typeof profile.age ===
        "number"
          ? String(
              profile.age,
            )
          : ""
      )

  const canSave =
    validName &&
    validAge &&
    hasChanges &&
    !updateMutation.isPending


  function handleSubmit(
    event:
      React.FormEvent<
        HTMLFormElement
      >,
  ) {
    event.preventDefault()

    if (!canSave) {
      return
    }

    updateMutation.mutate({
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
        handleSubmit
      }
    >
      {/* Nama */}
      <div className="space-y-2">
        <Label htmlFor="worker-name">
          Nama
        </Label>

        <Input
          id="worker-name"
          value={name}
          onChange={(
            event,
          ) =>
            setName(
              event.target
                .value,
            )
          }
          placeholder="Masukkan nama"
          autoComplete="name"
          className="min-h-11"
          disabled={
            updateMutation
              .isPending
          }
        />

        {!validName &&
        name.length > 0 ? (
          <p className="text-xs text-destructive">
            Nama tidak boleh kosong.
          </p>
        ) : null}
      </div>


      {/* Usia */}
      <div className="space-y-2">
        <Label htmlFor="worker-age">
          Usia
        </Label>

        <Input
          id="worker-age"
          type="number"
          min={1}
          max={120}
          inputMode="numeric"
          value={age}
          onChange={(
            event,
          ) =>
            setAge(
              event.target
                .value,
            )
          }
          placeholder="Contoh: 35"
          autoComplete="off"
          className="min-h-11"
          disabled={
            updateMutation
              .isPending
          }
        />

        {age.length > 0 &&
        !validAge ? (
          <p className="text-xs text-destructive">
            Usia harus antara 1 sampai
            120 tahun.
          </p>
        ) : null}
      </div>


      {/* Save */}
      <Button
        type="submit"
        className="min-h-11 w-full gap-2"
        disabled={
          !canSave
        }
      >
        {updateMutation
          .isPending ? (
          <>
            <Loader2
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden={true}
            />

            Menyimpan...
          </>
        ) : (
          <>
            <Save
              className="size-4"
              aria-hidden={true}
            />

            {hasChanges
              ? "Simpan Perubahan"
              : "Tidak Ada Perubahan"}
          </>
        )}
      </Button>
    </form>
  )
}


export function WorkerProfilePage() {
  const navigate =
    useNavigate()


  const profileQuery =
    useQuery({
      queryKey: [
        "worker",
        "profile",
      ],

      queryFn:
        getMyProfile,

      staleTime:
        60_000,

      retry: false,
    })


  if (
    profileQuery.isPending &&
    !profileQuery.data
  ) {
    return (
      <WorkerProfileSkeleton />
    )
  }


  const profile =
    profileQuery.data ??
    null


  return (
    <div
      className="
        space-y-5
        p-4
        pb-6
      "
    >
      {/* Header */}
      <section>
        <p
          className="
            text-sm
            font-medium
            text-primary
          "
        >
          Profil
        </p>

        <h1
          className="
            mt-1
            text-2xl
            font-bold
            tracking-tight
          "
        >
          Profil Anda
        </h1>

        <p
          className="
            mt-1
            text-sm
            leading-relaxed
            text-muted-foreground
          "
        >
          Periksa dan perbarui
          informasi dasar Anda.
        </p>
      </section>


      {/* Error */}
      {profileQuery.isError ? (
        <Alert variant="destructive">
          <TriangleAlert
            className="size-4"
            aria-hidden={true}
          />

          <AlertDescription>
            Profil tidak dapat dimuat.
            Silakan coba kembali.
          </AlertDescription>
        </Alert>
      ) : null}


      {/* Identity */}
      <Card
        className="
          border-primary/15
          shadow-sm
        "
      >
        <CardContent className="p-5">
          <div
            className="
              flex
              items-start
              gap-4
            "
          >
            <div
              className="
                flex
                size-14
                shrink-0
                items-center
                justify-center
                rounded-2xl
                bg-primary/10
                text-primary
              "
            >
              <UserRound
                className="size-7"
                aria-hidden={true}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p
                className="
                  truncate
                  text-lg
                  font-bold
                "
              >
                {profile?.name ||
                  "Nama belum dilengkapi"}
              </p>

              <p
                className="
                  mt-1
                  text-sm
                  text-muted-foreground
                "
              >
                Kode Worker
              </p>

              <p
                className="
                  mt-0.5
                  font-mono
                  text-sm
                  font-semibold
                "
              >
                {profile?.code ??
                  "—"}
              </p>

              <div className="mt-3">
                {profile?.is_active ? (
                  <Badge className="gap-1">
                    <BadgeCheck
                      className="size-3.5"
                      aria-hidden={true}
                    />

                    Aktif
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    Tidak Aktif
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Edit */}
      {profile ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Informasi Dasar
            </CardTitle>

            <CardDescription>
              Nama dan usia digunakan
              untuk melengkapi profil
              pribadi Anda.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <WorkerProfileForm
              key={[
                profile.id,
                profile.name,
                profile.age,
              ].join("-")}
              profile={
                profile
              }
            />
          </CardContent>
        </Card>
      ) : null}


      {/* Exposure shortcut */}
      <Card>
        <CardContent className="p-5">
          <button
            type="button"
            className="
              flex
              min-h-12
              w-full
              items-center
              justify-between
              gap-4
              rounded-xl
              text-left
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
            "
            onClick={() =>
              navigate(
                "/worker/profile/exposure",
              )
            }
          >
            <span
              className="
                flex
                min-w-0
                items-center
                gap-3
              "
            >
              <span
                className="
                  flex
                  size-11
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-muted
                "
              >
                <Scale
                  className="size-5"
                  aria-hidden={true}
                />
              </span>

              <span className="min-w-0">
                <span className="block font-semibold">
                  Data Pajanan
                </span>

                <span
                  className="
                    mt-0.5
                    block
                    text-sm
                    leading-relaxed
                    text-muted-foreground
                  "
                >
                  Berat badan, waktu,
                  frekuensi, dan durasi
                  pajanan.
                </span>
              </span>
            </span>

            <ArrowRight
              className="
                size-4
                shrink-0
                text-muted-foreground
              "
              aria-hidden={true}
            />
          </button>
        </CardContent>
      </Card>


      <p
        className="
          px-1
          text-center
          text-xs
          leading-relaxed
          text-muted-foreground
        "
      >
        Kode Worker dan status akun
        dikelola oleh petugas dan tidak
        dapat diubah dari halaman ini.
      </p>
    </div>
  )
}