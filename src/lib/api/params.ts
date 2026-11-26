import { isCategorySlug } from "@/lib/categories"
import type { ListListingsParams } from "@/lib/listings/types"

export const DEFAULT_LIMIT = 24
export const MAX_LIMIT = 100

/** Longest keyword query we accept; anything longer is truncated. */
export const MAX_SEARCH_LENGTH = 200

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> }

/** Return a trimmed UUID, or null when the value is not a UUID. */
export function parseUuid(value: string | null): string | null {
  const trimmed = (value ?? "").trim()
  return UUID_PATTERN.test(trimmed) ? trimmed : null
}

function parseCount(raw: string | null): { value?: number; error?: string } {
  if (raw === null || raw.trim() === "") return {}

  const value = Number(raw)
  if (!Number.isInteger(value)) return { error: "must be a whole number" }

  return { value }
}

/**
 * Parse `GET /api/listings` query parameters. Unknown categories and
 * non-integer counts are reported as errors; out-of-range counts are clamped
 * instead of rejected so a slightly wrong client still gets a page.
 */
export function parseListingsQuery(
  searchParams: URLSearchParams,
): ParseResult<ListListingsParams> {
  const errors: Record<string, string> = {}
  const params: ListListingsParams = {}

  const category = searchParams.get("category")
  if (category) {
    if (!isCategorySlug(category)) {
      errors.category = "Unknown category"
    } else {
      params.category = category
    }
  }

  const q = searchParams.get("q")
  if (q && q.trim()) {
    params.q = q.trim().slice(0, MAX_SEARCH_LENGTH)
  }

  const limit = parseCount(searchParams.get("limit"))
  if (limit.error) {
    errors.limit = `Limit ${limit.error}`
  } else if (limit.value !== undefined) {
    params.limit = Math.min(Math.max(limit.value, 1), MAX_LIMIT)
  }

  const offset = parseCount(searchParams.get("offset"))
  if (offset.error) {
    errors.offset = `Offset ${offset.error}`
  } else if (offset.value !== undefined) {
    params.offset = Math.max(offset.value, 0)
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return { ok: true, value: params }
}
