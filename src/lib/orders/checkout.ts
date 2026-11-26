import "server-only"

import { getStripe } from "@/lib/stripe/server"
import { platformFeeCents, priceToCents } from "@/lib/stripe/money"
import { getListing } from "@/lib/listings/queries"
import { findStripeAccountByEmail, getAccountStatus } from "@/lib/connect/queries"
import { isListingSold } from "./queries"

/**
 * Direct charges through Stripe Checkout: the session is created *on the
 * connected account* (`stripeAccount`), and the platform fee rides along in
 * `payment_intent_data.application_fee_amount`. The buyer sees one charge and
 * the fee is deducted from the seller's payout.
 *
 * `transfer_data` is deliberately absent — that would make it a destination
 * charge, which emits events from the platform instead of the connected
 * account and needs a different webhook endpoint.
 */

/** Why a checkout could not be started. All of them are the visitor's business. */
export type CheckoutFailure =
  | "listing_not_found"
  | "sold"
  | "seller_not_ready"

export class CheckoutError extends Error {
  constructor(
    readonly reason: CheckoutFailure,
    message: string,
  ) {
    super(message)
    this.name = "CheckoutError"
  }
}

export async function createCheckoutUrl(input: {
  listingId: string
  buyerEmail: string
  origin: string
}): Promise<string> {
  const listing = await getListing(input.listingId)
  if (!listing) {
    throw new CheckoutError(
      "listing_not_found",
      "This listing is no longer available.",
    )
  }

  if (await isListingSold(listing.id)) {
    throw new CheckoutError("sold", "This listing has already been sold.")
  }

  const account = await findStripeAccountByEmail(listing.seller_email)
  const flags = account ? await getAccountStatus(account.stripe_account_id) : null
  if (!account || !flags?.charges_enabled) {
    throw new CheckoutError(
      "seller_not_ready",
      "This seller has not finished connecting Stripe yet.",
    )
  }

  const amountCents = priceToCents(listing.price)
  const feeCents = platformFeeCents(amountCents)

  const session = await getStripe().checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: { name: listing.title },
          },
        },
      ],
      customer_email: input.buyerEmail,
      payment_intent_data: { application_fee_amount: feeCents },
      // Echoed back on the webhook, so the handler can record the order without
      // trusting anything the buyer sent.
      metadata: {
        listingId: listing.id,
        stripeAccountId: account.stripe_account_id,
        amountCents: String(amountCents),
        feeCents: String(feeCents),
      },
      success_url: `${input.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${input.origin}/checkout/cancel?session_id={CHECKOUT_SESSION_ID}&listing_id=${listing.id}`,
    },
    { stripeAccount: account.stripe_account_id },
  )

  if (!session.url) throw new Error("Stripe did not return a checkout URL")
  return session.url
}
