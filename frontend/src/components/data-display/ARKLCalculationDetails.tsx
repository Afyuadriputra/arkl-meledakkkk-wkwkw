import {
  BookOpen,
} from "lucide-react"
import { useId } from "react"
import { ARKLVerificationNotice } from "@/components/status/ARKLVerificationNotice"

type DisplayValue =
  | number
  | string
  | null
  | undefined

export type ARKLCalculationSnapshot = {
  exposure_profile_verified?: boolean | null
  reading_received_at?: string | null
  concentration_ppm: DisplayValue
  concentration_mg_m3: DisplayValue
  inhalation_rate: DisplayValue
  exposure_time: DisplayValue
  exposure_frequency: DisplayValue
  exposure_duration: DisplayValue
  body_weight: DisplayValue
  averaging_time: DisplayValue
  intake: DisplayValue
  rfc: DisplayValue
  rq: DisplayValue
}

type ARKLCalculationDetailsProps = {
  result: ARKLCalculationSnapshot
  formatNumber: (
    value: DisplayValue,
    maximumFractionDigits?: number,
  ) => string
}

type FormulaTerm = {
  symbol: string
  label: string
  abbreviation: string
  description: string
  value: DisplayValue
  unit?: string
  precision?: number
}

export function ARKLCalculationDetails({
  result,
  formatNumber,
}: ARKLCalculationDetailsProps) {
  const headingId = useId()
  const terms: FormulaTerm[] = [
    {
      symbol: "C",
      label: "Konsentrasi H₂S",
      abbreviation: "Concentration",
      description: "Konsentrasi udara hasil konversi dari ppm.",
      value: result.concentration_mg_m3,
      unit: "mg/m³",
      precision: 4,
    },
    {
      symbol: "R",
      label: "Laju inhalasi",
      abbreviation: "Inhalation Rate",
      description: "Volume udara yang dihirup per jam.",
      value: result.inhalation_rate,
      unit: "m³/jam",
      precision: 2,
    },
    {
      symbol: "tE",
      label: "Waktu pajanan",
      abbreviation: "Exposure Time",
      description: "Lama pajanan H₂S setiap hari.",
      value: result.exposure_time,
      unit: "jam/hari",
      precision: 2,
    },
    {
      symbol: "fE",
      label: "Frekuensi pajanan",
      abbreviation: "Exposure Frequency",
      description: "Jumlah hari pajanan dalam satu tahun.",
      value: result.exposure_frequency,
      unit: "hari/tahun",
      precision: 2,
    },
    {
      symbol: "Dt",
      label: "Durasi pajanan",
      abbreviation: "Exposure Duration",
      description: "Lama periode pajanan yang digunakan sistem.",
      value: result.exposure_duration,
      unit: "tahun",
      precision: 2,
    },
    {
      symbol: "Wb",
      label: "Berat badan",
      abbreviation: "Body Weight",
      description: "Berat badan pada profil pajanan.",
      value: result.body_weight,
      unit: "kg",
      precision: 2,
    },
    {
      symbol: "tavg",
      label: "Waktu rata-rata",
      abbreviation: "Averaging Time",
      description: "Waktu rata-rata yang dipakai untuk perhitungan.",
      value: result.averaging_time,
      unit: "hari",
      precision: 2,
    },
    {
      symbol: "I",
      label: "Asupan inhalasi",
      abbreviation: "Intake",
      description: "Nilai asupan inhalasi hasil perhitungan.",
      value: result.intake,
      precision: 8,
    },
    {
      symbol: "RfC",
      label: "Konsentrasi referensi",
      abbreviation: "Reference Concentration",
      description: "Nilai acuan yang digunakan untuk membandingkan intake.",
      value: result.rfc,
      precision: 6,
    },
    {
      symbol: "RQ",
      label: "Kuosien risiko",
      abbreviation: "Risk Quotient",
      description: "Hasil karakterisasi risiko pajanan, bukan peluang penyakit.",
      value: result.rq,
      precision: 4,
    },
  ]

  return (
    <section
      className="rounded-xl border bg-muted/15 p-4"
      aria-labelledby={headingId}
    >
      <ARKLVerificationNotice verified={result.exposure_profile_verified} />
      {result.reading_received_at ? (
        <p className="my-3 text-xs text-muted-foreground">
          Data IoT diterima: {new Date(result.reading_received_at).toLocaleString("id-ID")}
        </p>
      ) : null}
      <div className="flex gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BookOpen className="size-4" />
        </div>

        <div>
          <h3
            id={headingId}
            className="font-semibold"
          >
            Arti nilai perhitungan ARKL
          </h3>

          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Konsentrasi yang digunakan pada hasil ini: {formatNumber(result.concentration_ppm, 3)} ppm,
            kemudian dikonversi menjadi {formatNumber(result.concentration_mg_m3, 4)} mg/m³ untuk perhitungan.
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border bg-background px-4 py-3 text-center text-sm text-muted-foreground">
        <span className="font-medium text-foreground">I</span> = (C × R × tE × fE × Dt) / (Wb × tavg)
        <span className="mx-2 text-border">•</span>
        <span className="font-medium text-foreground">RQ</span> = I / RfC
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {terms.map((term) => (
          <div
            key={term.symbol}
            className="rounded-lg border bg-background p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">
                {term.label}
              </p>

              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">
                {term.symbol}
              </span>
            </div>

            <p className="mt-0.5 text-xs text-muted-foreground">
              {term.symbol} — {term.abbreviation}
            </p>

            <p className="numeric-data mt-2 font-semibold">
              {formatNumber(
                term.value,
                term.precision,
              )}{" "}
              {term.unit ?? ""}
            </p>

            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {term.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
