import type Stripe from "stripe"
import { getStripe } from "@/lib/stripe/server"
import { readAccountFlags } from "./account-flags"
import {
  findStripeAccountByEmail,
  insertStripeAccount,
  recordAccountEvent,
} from "./queries"
import type { StripeAccountRow } from "./types"

/**
 * Stripe calls for Connect onboarding.
 *
 * The platform requires Stripe to hold the loss liability, so accounts are
 * created through Accounts v2 (`defaults.responsibilities.losses_collector`)
 * rather than the legacy v1 `type` field — v1 account creation is rejected.
 * `dashboard: "express"` keeps Stripe's hosted onboarding UI, so the seller only
 * ever sees Stripe's pages.
 */

const ACCOUNT_PARAMS: Stripe.V2.Core.AccountCreateParams = {
  dashboard: "express",
  identity: { country: "US", entity_type: "individual" },
  configuration: {
    merchant: {
      capabilities: { card_payments: { requested: true } },
    },
  },
  defaults: {
    currency: "usd",
    // Who pays Stripe's processing fee and who carries negative balances. The
    // platform fee we add on top is unaffected: with `fees_collector: "stripe"`
    // `application_fee_amount` is our 10% alone.
    responsibilities: { fees_collector: "stripe", losses_collector: "stripe" },
  },
  include: ["configuration.merchant", "requirements", "identity", "defaults"],
}

async function createConnectAccount(email: string): Promise<StripeAccountRow> {
  const stripe = getStripe()
  const account = await stripe.v2.core.accounts.create({
    ...ACCOUNT_PARAMS,
    contact_email: email,
  })

  const row = await insertStripeAccount({
    seller_email: email,
    stripe_account_id: account.id,
  })
  // Record the starting state so the Connect page has something to show before
  // the first requirements event arrives.
  await recordAccountEvent(account.id, readAccountFlags(account))

  return row
}

/**
 * The URL that starts Stripe's onboarding for this seller. Creates the Connect
 * account on first use, then reuses it on every later call so a seller cannot
 * accumulate accounts by retrying.
 */
export async function createAccountLink(input: {
  email: string
  returnUrl: string
  refreshUrl: string
}): Promise<string> {
  let row = await findStripeAccountByEmail(input.email)
  if (!row) row = await createConnectAccount(input.email)

  const link = await getStripe().v2.core.accountLinks.create({
    account: row.stripe_account_id,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        // Up-front: collect everything now so the seller is never interrupted
        // later by a requirement deadline.
        collection_options: { fields: "eventually_due" },
        return_url: input.returnUrl,
        refresh_url: input.refreshUrl,
      },
    },
  })

  return link.url
}
