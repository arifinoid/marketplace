import { isEmail } from "@/lib/listings/validation"

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

/**
 * A seller is identified by the email on their listings, so the email is the
 * only input onboarding needs. It is normalised (trimmed, lowercased) so the
 * same person cannot end up with two Connect accounts.
 */
export function validateConnectEmail(
  input: unknown,
): ValidationResult<{ email: string }> {
  if (!isRecord(input)) {
    return { ok: false, errors: { _form: "Invalid request body" } }
  }

  const email =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : ""
  if (!isEmail(email)) {
    return { ok: false, errors: { email: "Enter a valid email address" } }
  }

  return { ok: true, value: { email } }
}

/** Normalise an email arriving in a query string, or null when unusable. */
export function parseEmailParam(value: string | null): string | null {
  const email = (value ?? "").trim().toLowerCase()
  return isEmail(email) ? email : null
}
