import type Stripe from "stripe"
import { getStripe } from "@/lib/stripe/server"
import { isThinEventNotification } from "@/lib/stripe/event-notification"
import { platformFeeCents } from "@/lib/stripe/money"
import { fetchAccountFlags } from "@/lib/connect/account-status"
import {
  findStripeAccountById,
  recordAccountEvent,
} from "@/lib/connect/queries"
import { insertOrder } from "@/lib/orders/queries"

/**
 * Accounts v2 event type names are outside the v1 `Stripe.Event` union, so the
 * thin notification is handled through this wider shape.
 */
type ThinNotification = {
  type: string
  related_object?: { id?: string } | null
}

/** The account events this endpoint subscribes to. */
const ACCOUNT_EVENT_TYPES = new Set([
  "v2.core.account[requirements].updated",
  "v2.core.account[configuration.merchant].updated",
  "v2.core.account[configuration.merchant].capability_status_updated",
])

/**
 * Stripe webhook. Registered as a Connect endpoint (`connect: true`) because
 * direct charges emit their events from the connected account.
 *
 * The body is read as text and never as JSON: signature verification covers the
 * exact bytes Stripe sent, so parsing it first would invalidate the signature.
 */
export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !secret) {
    return new Response("Missing Stripe signature", { status: 400 })
  }

  let type: string
  let accountId: string | undefined
  let session: Stripe.Checkout.Session | undefined

  try {
    if (isThinEventNotification(body)) {
      // v1 events carry the object; a thin notification only references it.
      const notification = getStripe().parseEventNotification(
        body,
        signature,
        secret,
      ) as unknown as ThinNotification
      type = notification.type
      accountId = notification.related_object?.id
    } else {
      const event = getStripe().webhooks.constructEvent(
        body,
        signature,
        secret,
      ) as Stripe.Event
      type = event.type
      if (event.type === "checkout.session.completed") {
        session = event.data.object as Stripe.Checkout.Session
      }
    }
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error)
    return new Response("Invalid signature", { status: 400 })
  }

  try {
    if (ACCOUNT_EVENT_TYPES.has(type)) {
      await handleAccountEvent(accountId)
    } else if (type === "checkout.session.completed" && session) {
      await handleCheckoutSessionCompleted(session)
    }
    // Anything else is acknowledged so Stripe does not retry it.
  } catch (error) {
    // A failure here is retried by Stripe, which is what we want for a state
    // change we have not recorded yet.
    console.error(`Stripe webhook ${type} failed:`, error)
    return new Response("server_error", { status: 500 })
  }

  return new Response("ok", { status: 200 })
}

/**
 * Re-read the account from Stripe. The webhook can arrive before the seller
 * finishes onboarding, and the redirect back to `/connect` can beat it —
 * re-reading keeps both paths honest.
 */
async function handleAccountEvent(accountId: string | undefined): Promise<void> {
  // The sandbox is shared, so this also fires for other candidates' sellers.
  // Anything we did not create an account for is acknowledged and dropped
  // rather than recorded.
  if (!accountId) return

  const known = await findStripeAccountById(accountId)
  if (!known) return

  const flags = await fetchAccountFlags(accountId)
  if (!flags) return

  await recordAccountEvent(accountId, flags)
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
