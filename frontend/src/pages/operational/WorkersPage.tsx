import {
  useState,
} from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import {
  Loader2,
  Plus,
  RefreshCw,
  TriangleAlert,
  UserRound,
  Users,
} from "lucide-react"
import {
  useNavigate,
} from "react-router-dom"
import {
  toast,
} from "sonner"

import {
  createWorker,
  getAllWorkers,
} from "@/api/exposure"

import {
  PageContainer,
} from "@/components/layout/PageContainer"
import {
  PageHeader,
} from "@/components/layout/PageHeader"

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Input,
} from "@/components/ui/input"
import {
  Label,
} from "@/components/ui/label"
import {
  Skeleton,
} from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"


function formatDateTime(
  value: string | null | undefined,
) {
  if (!value) {
    return "—"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "—"
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date)
}


function WorkersSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>

      <CardContent className="space-y-3">
        {Array.from({
          length: 6,
        }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-12 w-full"
          />
        ))}
      </CardContent>
    </Card>
  )
}


interface CreateWorkerDialogProps {
  onCreated:
    (workerId: number) => void
}


function CreateWorkerDialog({
  onCreated,
}: CreateWorkerDialogProps) {
  const queryClient =
    useQueryClient()

  const [
    open,
    setOpen,
  ] = useState(false)

  const [
    code,
    setCode,
  ] = useState("")

  const [
    name,
    setName,
  ] = useState("")

  const [
    age,
    setAge,
  ] = useState("")


  const ageNumber =
    Number(age)

  const validCode =
    code.trim().length > 0

  const validName =
    name.trim().length > 0

  const validAge =
    Number.isInteger(ageNumber) &&
    ageNumber >= 1 &&
    ageNumber <= 120


  const createMutation =
    useMutation({
      mutationFn: createWorker,

      onSuccess: async (worker) => {
        await queryClient.invalidateQueries({
          queryKey: [
            "workers",
          ],
        })

        toast.success(
          "Pemulung berhasil ditambahkan.",
        )

        setOpen(false)
        setCode("")
        setName("")
        setAge("")

        onCreated(worker.id)
      },

      onError: () => {
        toast.error(
          "Pemulung belum berhasil ditambahkan.",
        )
      },
    })


  const canSubmit =
    validCode &&
    validName &&
    validAge &&
    !createMutation.isPending


  function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    createMutation.mutate({
      code: code.trim(),
      name: name.trim(),
      age: ageNumber,
    })
  }


  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (
          createMutation.isPending
        ) {
          return
        }

        setOpen(nextOpen)
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            className="gap-2"
          />
        }
      >
        <Plus className="size-4" />
        Tambah Pemulung
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Tambah Pemulung
          </DialogTitle>

          <DialogDescription>
            Masukkan identitas dasar pemulung.
            Data pajanan dapat dilengkapi setelah
            profil dibuat.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-5"
          onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <Label htmlFor="worker-code">
              Kode Pemulung
            </Label>

            <Input
              id="worker-code"
              value={code}
              onChange={(event) =>
                setCode(
                  event.target.value,
                )
              }
              placeholder="Contoh: PML-001"
              autoComplete="off"
              disabled={
                createMutation.isPending
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="worker-name">
              Nama
            </Label>

            <Input
              id="worker-name"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value,
                )
              }
              placeholder="Nama pemulung"
              disabled={
                createMutation.isPending
              }
            />
          </div>

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
              onChange={(event) =>
                setAge(
                  event.target.value,
                )
              }
              placeholder="Contoh: 40"
              disabled={
                createMutation.isPending
              }
            />

            {age.length > 0 &&
            !validAge ? (
              <p className="text-xs text-destructive">
                Usia harus antara 1–120 tahun.
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={
                createMutation.isPending
              }
              onClick={() =>
                setOpen(false)
              }
            >
              Batal
            </Button>

            <Button
              type="submit"
              disabled={!canSubmit}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Tambah
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}


export function WorkersPage() {
  const navigate =
    useNavigate()

  const workersQuery =
    useQuery({
      queryKey: [
        "workers",
        "list",
        "all",
      ],
      queryFn: getAllWorkers,
      staleTime: 30_000,
    })


  const workers =
    workersQuery.data ??
    []

  const totalWorkers =
    workers.length

  const activeWorkers =
    workers.filter(
      (worker) =>
        worker.is_active,
    ).length


  return (
    <PageContainer>
      <PageHeader
        title="Pemulung"
        description="Kelola identitas, data pajanan, perangkat monitoring, dan status pemulung."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void workersQuery.refetch()
              }
              disabled={
                workersQuery.isFetching
              }
            >
              <RefreshCw
                className={
                  workersQuery.isFetching
                    ? "size-4 animate-spin"
                    : "size-4"
                }
              />

              Perbarui
            </Button>

            <CreateWorkerDialog
              onCreated={(workerId) =>
                navigate(
                  `/app/workers/${workerId}`,
                )
              }
            />
          </div>
        }
      />

      <div className="mt-8 space-y-6">
        {workersQuery.isError ? (
          <Alert variant="destructive">
            <TriangleAlert className="size-4" />

            <AlertDescription>
              Data pemulung tidak dapat
              dimuat. Silakan coba kembali.
            </AlertDescription>
          </Alert>
        ) : null}

        <section
          aria-label="Ringkasan pemulung"
          className="grid gap-4 sm:grid-cols-3"
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users className="size-4" />
                Total Pemulung
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="numeric-data text-3xl font-bold">
                {totalWorkers}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Aktif
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="numeric-data text-3xl font-bold text-status-normal">
                {activeWorkers}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <UserRound className="size-4" />
                Ditampilkan
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="numeric-data text-3xl font-bold">
                {workers.length}
              </p>
            </CardContent>
          </Card>
        </section>

        {workersQuery.isPending ? (
          <WorkersSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                Daftar Pemulung
              </CardTitle>

              <CardDescription>
                Pilih pemulung untuk mengelola
                profil, perangkat monitoring,
                pajanan, ARKL, dan peringatan.
                Gulir daftar untuk melihat seluruh data pemulung.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {workers.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="mx-auto size-10 text-muted-foreground/40" />

                  <p className="mt-4 font-medium">
                    Belum ada data pemulung
                  </p>

                  <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                    Tambahkan pemulung pertama
                    untuk mulai mengelola data
                    pajanan dan monitoring.
                  </p>
                </div>
              ) : (
                <div
                  role="region"
                  aria-label="Daftar seluruh pemulung"
                  tabIndex={0}
                  className="workers-list-scroll max-h-[min(60vh,36rem)] overflow-auto rounded-lg border outline-none focus-visible:ring-2 focus-visible:ring-ring [&>[data-slot=table-container]]:overflow-visible"
                >
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-card shadow-sm">
                      <TableRow>
                        <TableHead>
                          Pemulung
                        </TableHead>

                        <TableHead>
                          Usia
                        </TableHead>

                        <TableHead>
                          Perangkat
                        </TableHead>

                        <TableHead>
                          Status
                        </TableHead>

                        <TableHead>
                          Terakhir Diubah
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {workers.map(
                        (worker) => (
                          <TableRow
                            key={worker.id}
                            className="
                              cursor-pointer
                              transition-colors
                              hover:bg-muted/40
                            "
                            tabIndex={0}
                            onClick={() =>
                              navigate(
                                `/app/workers/${worker.id}`,
                              )
                            }
                            onKeyDown={(
                              event,
                            ) => {
                              if (
                                event.key ===
                                  "Enter" ||
                                event.key ===
                                  " "
                              ) {
                                event.preventDefault()

                                navigate(
                                  `/app/workers/${worker.id}`,
                                )
                              }
                            }}
                          >
                            <TableCell>
                              <div>
                                <p className="font-semibold">
                                  {worker.name}
                                </p>

                                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                  {worker.code}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell className="numeric-data">
                              {worker.age} tahun
                            </TableCell>

                            <TableCell>
                              {worker.monitoring_device ? (
                                <div>
                                  <p className="font-medium">
                                    {worker.monitoring_device_name?.trim() ||
                                      worker.monitoring_device_code ||
                                      "Perangkat"}
                                  </p>

                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    {worker.monitoring_device_location?.trim() ||
                                      worker.monitoring_device_code}
                                  </p>
                                </div>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="rounded-full text-muted-foreground"
                                >
                                  Belum ditetapkan
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  worker.is_active
                                    ? "rounded-full border-status-normal/20 bg-status-normal/10 text-status-normal"
                                    : "rounded-full text-muted-foreground"
                                }
                              >
                                {worker.is_active
                                  ? "Aktif"
                                  : "Tidak Aktif"}
                              </Badge>
                            </TableCell>

                            <TableCell className="whitespace-nowrap text-muted-foreground">
                              {formatDateTime(
                                worker.updated_at,
                              )}
                            </TableCell>
                          </TableRow>
                        ),
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  )
}
