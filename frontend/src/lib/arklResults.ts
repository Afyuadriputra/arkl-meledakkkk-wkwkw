import type { ARKLResult } from "@/api/arkl"

export function latestARKLByType(results: ARKLResult[], type: ARKLResult["calculation_type"]) {
  return results.filter((result) => result.calculation_type === type).sort((a, b) => {
    const dateA = type === "REFERENCE" ? a.reference_measurement?.measured_at ?? a.created_at : a.created_at
    const dateB = type === "REFERENCE" ? b.reference_measurement?.measured_at ?? b.created_at : b.created_at
    return Date.parse(dateB) - Date.parse(dateA) || b.id - a.id
  })[0] ?? null
}
