import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { isApiError } from "@/api/client"
import { updateExposureProfile, type ExposureProfile } from "@/api/exposure"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ExposureReviewPanel({ exposure, onReviewed }: {
  exposure: ExposureProfile
  onReviewed: () => void
}) {
  const [note, setNote] = useState(exposure.review_note ?? "")
  const review = useMutation({
    mutationFn: (approval_status: "APPROVED" | "REJECTED") =>
      updateExposureProfile(exposure.id, { approval_status, review_note: note.trim() }),
    onSuccess: () => { toast.success("Status pemeriksaan tersimpan."); onReviewed() },
    onError: (error) => toast.error(isApiError(error) ? error.message : "Status belum berhasil disimpan."),
  })

  return (
    <section aria-label="Persetujuan profil pajanan" className="space-y-3 rounded-xl border bg-muted/25 p-4">
      <p className="text-sm font-semibold">
        {exposure.approval_status === "APPROVED" ? "Disetujui untuk ARKL" :
          exposure.approval_status === "REJECTED" ? "Perlu perbaikan" : "Menunggu ACC petugas"}
      </p>
      <p className="text-xs text-muted-foreground">
        Periksa data pekerja sebelum ACC. Sebelum ACC, ARKL menggunakan data ini dengan label hasil sementara.
      </p>
      <Label htmlFor={`review-note-${exposure.id}`}>Catatan pemeriksaan</Label>
      <Input id={`review-note-${exposure.id}`} value={note} disabled={review.isPending}
        onChange={(event) => setNote(event.target.value)} placeholder="Wajib diisi jika meminta perbaikan" />
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={review.isPending || exposure.approval_status === "APPROVED"}
          onClick={() => review.mutate("APPROVED")}>ACC Data Pajanan</Button>
        <Button type="button" variant="outline" disabled={review.isPending || !note.trim()}
          onClick={() => review.mutate("REJECTED")}>Minta Perbaikan</Button>
      </div>
    </section>
  )
}
