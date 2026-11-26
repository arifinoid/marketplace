import { isEmail } from "@/lib/listings/validation"
import type { CreateMessageInput } from "./types"

export const MESSAGE_MIN = 1
export const MESSAGE_MAX = 2000

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function validateMessageInput(
  input: unknown,
): ValidationResult<CreateMessageInput> {
  if (!isRecord(input)) {
    return { ok: false, errors: { _form: "Invalid request body" } }
  }

  const errors: Record<string, string> = {}

  const listing_id =
    typeof input.listing_id === "string" ? input.listing_id.trim() : ""
  if (!UUID_PATTERN.test(listing_id)) {
    errors.listing_id = "A valid listing id is required"
  }

  const buyer_email =
    typeof input.buyer_email === "string" ? input.buyer_email.trim() : ""
  if (!isEmail(buyer_email)) {
    errors.buyer_email = "Enter a valid email address"
  }

  const message = typeof input.message === "string" ? input.message.trim() : ""
  if (message.length < MESSAGE_MIN) {
    errors.message = "Message is required"
  } else if (message.length > MESSAGE_MAX) {
    errors.message = `Message must be at most ${MESSAGE_MAX} characters`
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    value: { listing_id, buyer_email, message },
  }
}
