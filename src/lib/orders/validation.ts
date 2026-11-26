import { parseUuid } from "@/lib/api/params"
import { isEmail } from "@/lib/listings/validation"
import type { CheckoutInput } from "./types"

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

/**
 * A buyer is identified by their email, exactly like a seller: there is no
 * auth, so the email is the only thing tying the checkout to a person. The
 * listing id must be a UUID so a malformed value is rejected before it reaches
 * Supabase.
 */
export function validateCheckoutInput(
  input: unknown,
): ValidationResult<CheckoutInput> {
  if (!isRecord(input)) {
    return { ok: false, errors: { _form: "Invalid request body" } }
  }

  const listingId = parseUuid(
    typeof input.listing_id === "string" ? input.listing_id : null,
  )
  const buyerEmail =
    typeof input.buyer_email === "string"
      ? input.buyer_email.trim().toLowerCase()
      : ""

  if (!listingId || !isEmail(buyerEmail)) {
    const errors: Record<string, string> = {}
    if (!listingId) errors.listing_id = "Enter a valid listing id"
    if (!isEmail(buyerEmail)) {
      errors.buyer_email = "Enter a valid email address"
    }
    return { ok: false, errors }
  }

  return { ok: true, value: { listing_id: listingId, buyer_email: buyerEmail } }
}
