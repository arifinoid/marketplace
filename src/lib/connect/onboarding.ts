import type Stripe from "stripe"
import { getStripe } from "@/lib/stripe/server"
import {
  findStripeAccountByEmail,
  insertStripeAccount,
  recordAccountEvent,
} from "./queries"
import type { AccountFlags, StripeAccountRow } from "./types"

/**
 * Stripe calls for Connect onboarding. Express accounts: Stripe owns KYC and
 * the onboarding UI, so the seller only ever sees Stripe's pages.
 */

const ACCOUNT_PARAMS = {
  type: "express",
  country: "US",
  business_type: "individual",
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
} as const

function readFlags(account: Stripe.Account): AccountFlags {
  return {
    charges_enabled: account.charges_enabled ?? false,
    details_submitted: account.details_submitted ?? false,
    payouts_enabled: account.payouts_enabled ?? false,
  }
}

async function createConnectAccount(email: string): Promise<StripeAccountRow> {
  const stripe = getStripe()
  const account = await stripe.accounts.create({ ...ACCOUNT_PARAMS, email })
  const flags = readFlags(account)

  const row = await insertStripeAccount({
    seller_email: email,
    stripe_account_id: account.id,
  })
  // Record the starting state so the Connect page has something to show before
  // the first account.updated event arrives.
  await recordAccountEvent(account.id, flags)

  return row
}

/**
 * The URL that starts Stripe's onboarding for this seller. Creates the Connect
 * account on first use, then reuses it on every later call so a seller cannot
 * accumulate accounts by retrying.
 */
export async function createAccountLink(input: {
  email: string
  refreshUrl: string
  returnUrl: string
}): Promise<string> {
  let row = await findStripeAccountByEmail(input.email)
  if (!row) row = await createConnectAccount(input.email)

  const link = await getStripe().accountLinks.create({
    account: row.stripe_account_id,
    refresh_url: input.refreshUrl,
    return_url: input.returnUrl,
    type: "account_onboarding",
  })

  return link.url
}
