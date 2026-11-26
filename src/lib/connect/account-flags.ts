import type Stripe from "stripe"
import type { AccountFlags } from "./types"

/**
 * Translating Accounts v2 onboarding state into the three flags the schema
 * stores. Accounts v2 has no `charges_enabled` boolean, so the merchant
 * capability status and the outstanding requirements are the equivalent
 * signals.
 *
 * Pure on purpose: it is unit tested, and it must not pull the Stripe client
 * (which is server-only) into a test or a client module.
 */
export function readAccountFlags(account: Stripe.V2.Core.Account): AccountFlags {
  const entries = account.requirements?.entries ?? []
  const restricted = (capability: string) =>
    entries.some((entry) =>
      entry.impact.restricts_capabilities?.some(
        (impact) => impact.capability === capability,
      ),
    )

  return {
    charges_enabled:
      account.configuration?.merchant?.capabilities?.card_payments?.status ===
      "active",
    // Nothing left for the seller to fill in means the form was submitted.
    details_submitted: entries.every(
      (entry) => entry.awaiting_action_from !== "user",
    ),
    payouts_enabled: !restricted("stripe_balance.payouts"),
  }
}
