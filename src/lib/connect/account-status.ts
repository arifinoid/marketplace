import { getStripe } from "@/lib/stripe/server"
import { readAccountFlags } from "./account-flags"
import type { AccountFlags } from "./types"

/** Capability and requirement fields are only populated when asked for. */
const ACCOUNT_INCLUDE = ["configuration.merchant", "requirements"] as const

/**
 * Read the live onboarding flags for a connected account. The webhook and the
 * seller's redirect back from onboarding can arrive in either order, so
 * callers re-read Stripe rather than trusting the last row we stored.
 */
export async function fetchAccountFlags(
  stripeAccountId: string,
): Promise<AccountFlags | null> {
  try {
    const account = await getStripe().v2.core.accounts.retrieve(
      stripeAccountId,
      { include: [...ACCOUNT_INCLUDE] },
    )
    return readAccountFlags(account)
  } catch {
    // An unreadable account is "no flags yet" rather than an error: onboarding
    // state is allowed to be unknown.
    return null
  }
}
