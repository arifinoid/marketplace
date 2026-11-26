import type Stripe from "stripe"
import { getStripe } from "@/lib/stripe/server"
import { platformFeeCents } from "@/lib/stripe/money"
import { findStripeAccountById, recordAccountEvent } from "@/lib/connect/queries"
import { insertOrder } from "@/lib/orders/queries"

/**
 * Stripe webhook. Registered as a Connect endpoint (`connect: true`) because
 * direct charges emit their events from the connected account.
 *
 * The body is read as text and never as JSON: `constructEvent` verifies the
 * signature against the exact bytes Stripe sent, so parsing it first would
 * invalidate the signature.
 */
export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !secret) {
    return new Response("Missing Stripe signature", { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret)
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error)
    return new Response("Invalid signature", { status: 400 })
  }

  try {
    switch (event.type) {
      case "account.updated":
        await handleAccountUpdated(event.data.object as Stripe.Account)
        break
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        )
        break
      default:
        // The endpoint subscribes to two events; anything else is acknowledged
        // so Stripe does not retry it.
        break
    }
  } catch (error) {
    // A failure here is retried by Stripe, which is what we want for a state
    // change we have not recorded yet.
    console.error(`Stripe webhook ${event.type} failed:`, error)
    return new Response("server_error", { status: 500 })
  }

  return new Response("ok", { status: 200 })
}

async function handleAccountUpdated(account: Stripe.Account): Promise<void> {
  // The sandbox is shared, so this also fires for other candidates' sellers.
  // Anything we did not create an account for is acknowledged and dropped
  // rather than recorded.
  const known = await findStripeAccountById(account.id)
  if (!known) return

  await recordAccountEvent(account.id, {
    charges_enabled: account.charges_enabled ?? false,
    details_submitted: account.details_submitted ?? false,
    payouts_enabled: account.payouts_enabled ?? false,
  })
}

/**
 * Record the order for a paid checkout. The listing id and the connected
 * account come from the session metadata, which our own server wrote — the
 * signature check above is what makes that trustworthy.
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const listingId = session.metadata?.listingId
  const stripeAccountId = session.metadata?.stripeAccountId
  const buyerEmail = session.customer_details?.email ?? session.customer_email
  if (!listingId || !stripeAccountId || !buyerEmail) return

  // `checkout.session.completed` also fires for payment methods that have not
  // settled (bank transfers, installments). Only a paid session is an order.
  if (session.payment_status !== "paid") return

  const amountCents = session.amount_total ?? 0
  const feeCents = Number(session.metadata?.feeCents ?? "")
  const currency = (session.currency ?? "usd").toLowerCase()

  // `insertOrder` returns null when another session already paid for this
  // listing — a retried event or a racing buyer. Both are fine: the listing is
  // sold and Stripe still retries only on a non-2xx response.
  await insertOrder({
    listing_id: listingId,
    buyer_email: buyerEmail,
    stripe_checkout_session_id: session.id,
    stripe_account_id: stripeAccountId,
    amount_cents: amountCents,
    fee_cents: Number.isFinite(feeCents) ? feeCents : platformFeeCents(amountCents),
    currency,
    status: "paid",
  })
}
