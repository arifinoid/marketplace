import { getSupabase } from "@/lib/supabase/server"
import type { AccountFlags, StripeAccountRow } from "./types"

/**
 * Reads and writes for Connect onboarding. Everything here is INSERT-only, in
 * line with the rest of the schema: the account row is created once and
 * onboarding state is appended as events, so no UPDATE policy is ever needed.
 */

export async function findStripeAccountByEmail(
  email: string,
): Promise<StripeAccountRow | null> {
  const { data } = await getSupabase()
    .from("stripe_accounts")
    .select("*")
    .eq("seller_email", email)
    .maybeSingle()

  return (data as StripeAccountRow | null) ?? null
}

export async function findStripeAccountById(
  stripeAccountId: string,
): Promise<StripeAccountRow | null> {
  const { data } = await getSupabase()
    .from("stripe_accounts")
    .select("*")
    .eq("stripe_account_id", stripeAccountId)
    .maybeSingle()

  return (data as StripeAccountRow | null) ?? null
}

/**
 * Store the Connect account for a seller. Re-sending the same email (a double
 * click, a retry) keeps the original row rather than failing on the unique
 * constraint, so the seller never ends up with two Stripe accounts.
 */
export async function insertStripeAccount(input: {
  seller_email: string
  stripe_account_id: string
}): Promise<StripeAccountRow> {
  const { error } = await getSupabase()
    .from("stripe_accounts")
    .upsert(input, { onConflict: "seller_email", ignoreDuplicates: true })

  if (error) {
    throw new Error(`Failed to store the Connect account: ${error.message}`)
  }

  const row = await findStripeAccountByEmail(input.seller_email)
  if (!row) throw new Error("Connect account was not stored")
  return row
}

/** Append the flags Stripe reported. Unknown accounts are ignored by the caller. */
export async function recordAccountEvent(
  stripeAccountId: string,
  flags: AccountFlags,
): Promise<void> {
  const { error } = await getSupabase()
    .from("stripe_account_events")
    .insert({
      stripe_account_id: stripeAccountId,
      charges_enabled: flags.charges_enabled,
      details_submitted: flags.details_submitted,
      payouts_enabled: flags.payouts_enabled,
    })

  if (error) {
    throw new Error(`Failed to record the account event: ${error.message}`)
  }
}

/** The most recent flags we recorded for an account, or null when none yet. */
export async function getAccountStatus(
  stripeAccountId: string,
): Promise<AccountFlags | null> {
  const { data } = await getSupabase()
    .from("stripe_account_events")
    .select(
      "charges_enabled, details_submitted, payouts_enabled",
    )
    .eq("stripe_account_id", stripeAccountId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data as AccountFlags | null) ?? null
}
