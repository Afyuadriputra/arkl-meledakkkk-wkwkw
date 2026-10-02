import {
  useState,
  type FormEvent,
} from "react"
import {
  useNavigate,
} from "react-router-dom"
import {
  Activity,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react"

import {
  getCurrentUser,
  login,
} from "@/api/auth"

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert"
import {
  Button,
} from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Input,
} from "@/components/ui/input"
import {
  Label,
} from "@/components/ui/label"

type LoginFormState = {
  username: string
  password: string
}

export function LoginPage() {
  const navigate =
    useNavigate()

  const [form, setForm] =
    useState<LoginFormState>({
      username: "",
      password: "",
    })

  const [
    showPassword,
    setShowPassword,
  ] = useState(false)

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState<string | null>(null)

  function updateField(
    field: keyof LoginFormState,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))

    if (error) {
      setError(null)
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    const username =
      form.username.trim()

    const password =
      form.password

    if (!username || !password) {
      setError(
        "Nama pengguna dan kata sandi wajib diisi.",
      )

      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      await login({
        username,
        password,
      })

      const currentUser =
        await getCurrentUser()

      switch (currentUser.role) {
        case "ADMIN":
        case "OPERATOR":
          navigate(
            "/app/dashboard",
            {
              replace: true,
            },
          )
          return

        case "RESEARCHER":
          navigate(
            "/research/dashboard",
            {
              replace: true,
            },
          )
          return

        case "WORKER":
          /*
           * WorkerSetupGuard yang menentukan
           * apakah Worker masuk ke Home
           * atau Onboarding.
           */
          navigate(
            "/worker",
            {
              replace: true,
            },
          )
          return

        default:
          setError(
            "Jenis akun belum didukung oleh aplikasi.",
          )
      }
    } catch (cause) {
      const message =
        cause instanceof Error &&
        cause.message
          ? cause.message
          : "Tidak dapat masuk. Periksa nama pengguna dan kata sandi."

      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formIncomplete =
    !form.username.trim() ||
    !form.password

  return (
    <main
      className="
        grid
        h-[100dvh]
        min-h-0
        place-items-center
        overflow-hidden
        bg-background
        px-4
        py-3
        sm:px-6
      "
    >
      <Card
        className="
          w-full
          max-w-[420px]
          overflow-hidden
          border-border/70
          shadow-sm
        "
      >
        <CardContent className="p-0">
          {/* Brand */}
          <section
            className="
              border-b
              bg-muted/20
              px-5
              py-4
              text-center
              sm:px-7
              sm:py-5
            "
          >
            <div
              className="
                mx-auto
                flex
                size-11
                items-center
                justify-center
                rounded-2xl
                bg-primary
                text-primary-foreground
                shadow-sm
              "
            >
              <Activity
                className="size-5"
                aria-hidden="true"
              />
            </div>

            <h1
              className="
                mt-2
                text-xl
                font-bold
                tracking-tight
                text-primary
                sm:text-2xl
              "
            >
              SMART H₂S
            </h1>

            <p
              className="
                mx-auto
                mt-1
                max-w-[280px]
                text-xs
                leading-relaxed
                text-muted-foreground
                sm:text-sm
              "
            >
              Pemantauan H₂S dan risiko
              kesehatan lingkungan
            </p>
          </section>

          {/* Login */}
          <section
            className="
              px-5
              py-4
              sm:px-7
              sm:py-5
            "
          >
            <div className="mb-4">
              <h2
                className="
                  text-lg
                  font-bold
                  tracking-tight
                  sm:text-xl
                "
              >
                Masuk
              </h2>

              <p
                className="
                  mt-0.5
                  text-xs
                  text-muted-foreground
                  sm:text-sm
                "
              >
                Masukkan akun yang diberikan petugas.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-3.5"
              noValidate
            >
              {error ? (
                <Alert
                  variant="destructive"
                  className="py-3"
                >
                  <TriangleAlert className="size-4" />

                  <AlertDescription className="text-xs sm:text-sm">
                    {error}
                  </AlertDescription>
                </Alert>
              ) : null}

              {/* Username */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="username"
                  className="text-sm font-medium"
                >
                  Nama Pengguna
                </Label>

                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="Contoh: worker1"
                  value={form.username}
                  disabled={isSubmitting}
                  aria-invalid={
                    Boolean(error)
                  }
                  className="h-11"
                  onChange={(event) =>
                    updateField(
                      "username",
                      event.target.value,
                    )
                  }
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium"
                >
                  Kata Sandi
                </Label>

                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="current-password"
                    placeholder="Masukkan kata sandi"
                    value={form.password}
                    disabled={isSubmitting}
                    aria-invalid={
                      Boolean(error)
                    }
                    className="h-11 pr-12"
                    onChange={(event) =>
                      updateField(
                        "password",
                        event.target.value,
                      )
                    }
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="
                      absolute
                      right-0.5
                      top-1/2
                      size-10
                      -translate-y-1/2
                    "
                    aria-label={
                      showPassword
                        ? "Sembunyikan kata sandi"
                        : "Tampilkan kata sandi"
                    }
                    aria-pressed={
                      showPassword
                    }
                    disabled={
                      isSubmitting
                    }
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current,
                      )
                    }
                  >
                    {showPassword ? (
                      <EyeOff
                        className="size-4"
                        aria-hidden="true"
                      />
                    ) : (
                      <Eye
                        className="size-4"
                        aria-hidden="true"
                      />
                    )}
                  </Button>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="
                  h-11
                  w-full
                  font-semibold
                "
                disabled={
                  isSubmitting ||
                  formIncomplete
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />

                    Memeriksa akun...
                  </>
                ) : (
                  "Masuk"
                )}
              </Button>
            </form>

            {/* Trust cue */}
            <div
              className="
                mt-4
                flex
                items-center
                justify-center
                gap-2
                border-t
                pt-3
                text-[11px]
                text-muted-foreground
                sm:text-xs
              "
            >
              <ShieldCheck
                className="size-3.5 shrink-0 text-primary"
                aria-hidden="true"
              />

              <span>
                Hanya untuk pengguna terdaftar
              </span>
            </div>
          </section>
        </CardContent>
      </Card>
    </main>
  )
}