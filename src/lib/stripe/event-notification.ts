/**
 * Stripe delivers v1 events as classic `event` payloads and Accounts v2 events
 * as thin `v2.core.event` notifications. The two need different SDK calls
 * (`webhooks.constructEvent` rejects a thin notification outright), so the
 * webhook route branches on this check before verifying anything.
 *
 * The parsed value is only used to pick a branch: the signature is verified
 * afterwards against the untouched raw body.
 */
export function isThinEventNotification(body: string): boolean {
  try {
    const parsed: unknown = JSON.parse(body)
    if (typeof parsed !== "object" || parsed === null) return false
    return (parsed as { object?: unknown }).object === "v2.core.event"
  } catch {
    // Not JSON. Let the SDK report it so the response stays a 400.
    return false
  }
}
