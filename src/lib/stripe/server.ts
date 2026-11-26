import "server-only"
import Stripe from "stripe"

const globalForStripe = globalThis as unknown as { stripe?: Stripe }

/**
 * Server-only Stripe client. Route handlers use this; components never do —
 * they call `/api/*`, and the secret key stays out of the browser bundle.
 *
 * `apiVersion` is deliberately omitted so the SDK uses the account's default,
 * which is what the sandbox platform expects. Created lazily so `next build`
 * does not require the env vars to be present.
 */
export function getStripe(): Stripe {
  if (globalForStripe.stripe) return globalForStripe.stripe

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY in the environment")
  }

  // Cached on globalThis so a warm function instance reuses one client instead
  // of paying for a new agent on every request.
  globalForStripe.stripe = new Stripe(secretKey)

  return globalForStripe.stripe
}
