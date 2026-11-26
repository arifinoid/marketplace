import type Stripe from "stripe"
import { getStripe } from "@/lib/stripe/server"
import { findStripeAccountById, recordAccountEvent } from "@/lib/connect/queries"

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
    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account

      // The sandbox is shared, so this also fires for other candidates'
      // sellers. Anything we did not create an account for is acknowledged and
      // dropped rather than recorded.
      const known = await findStripeAccountById(account.id)
      if (known) {
        await recordAccountEvent(account.id, {
          charges_enabled: account.charges_enabled ?? false,
          details_submitted: account.details_submitted ?? false,
          payouts_enabled: account.payouts_enabled ?? false,
        })
      }
    }
  } catch (error) {
    // A failure here is retried by Stripe, which is what we want for a state
    // change we have not recorded yet.
    console.error(`Stripe webhook ${event.type} failed:`, error)
    return new Response("server_error", { status: 500 })
  }

  return new Response("ok", { status: 200 })
}
