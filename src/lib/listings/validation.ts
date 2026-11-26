import { isCategorySlug } from "@/lib/categories"
import type { CreateListingInput } from "./types"

export const TITLE_MIN = 3
export const TITLE_MAX = 255
export const DESCRIPTION_MIN = 1
export const DESCRIPTION_MAX = 5000
export const PRICE_MIN = 0
export const PRICE_MAX = 99_999_999.99
export const EMAIL_MAX = 254

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> }

export function isEmail(value: string): boolean {
  return value.length <= EMAIL_MAX && EMAIL_PATTERN.test(value)
}

export function parsePrice(raw: unknown): number | null {
  if (typeof raw !== "number" && typeof raw !== "string") return null

  const text = String(raw).trim()
  if (!PRICE_PATTERN.test(text)) return null

  const value = Number(text)
  return Number.isFinite(value) ? value : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function validateListingInput(
  input: unknown,
): ValidationResult<CreateListingInput> {
  if (!isRecord(input)) {
    return { ok: false, errors: { _form: "Invalid request body" } }
  }

  const errors: Record<string, string> = {}

  const title = typeof input.title === "string" ? input.title.trim() : ""
  if (title.length < TITLE_MIN) {
    errors.title = `Title must be at least ${TITLE_MIN} characters`
  } else if (title.length > TITLE_MAX) {
    errors.title = `Title must be at most ${TITLE_MAX} characters`
  }

  const description =
    typeof input.description === "string" ? input.description.trim() : ""
  if (description.length < DESCRIPTION_MIN) {
    errors.description = "Description is required"
  } else if (description.length > DESCRIPTION_MAX) {
    errors.description = `Description must be at most ${DESCRIPTION_MAX} characters`
  }

  const price = parsePrice(input.price)
  if (price === null) {
    errors.price = "Price must be a number with at most 2 decimals"
  } else if (price < PRICE_MIN) {
    errors.price = "Price cannot be negative"
  } else if (price > PRICE_MAX) {
    errors.price = "Price is too large"
  }

  const category = typeof input.category === "string" ? input.category : ""
  if (!isCategorySlug(category)) {
    errors.category = "Unknown category"
  }

  const seller_email =
    typeof input.seller_email === "string" ? input.seller_email.trim() : ""
  if (!isEmail(seller_email)) {
    errors.seller_email = "Enter a valid email address"
  }

  const image_url =
    typeof input.image_url === "string" ? input.image_url.trim() : ""
  if (!image_url) {
    errors.image_url = "A photo is required"
  } else if (!image_url.startsWith("https://")) {
    errors.image_url = "Photo must be an https URL"
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    value: {
      title,
      description,
      price: price as number,
      category,
      seller_email,
      image_url,
    },
  }
}
