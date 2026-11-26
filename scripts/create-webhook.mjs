/**
 * Register the Stripe Connect webhook endpoint (sandbox).
 *
 *   node --env-file=.env.local scripts/create-webhook.mjs
 *
 * The signing secret is printed once, when the endpoint is first created. Put
 * it in STRIPE_WEBHOOK_SECRET, both in `.env.local` and in the Vercel dashboard.
 *
 * Point WEBHOOK_URL at the production deployment: Vercel password-protects
 * preview deployments, so Stripe cannot reach them.
 *
 * An endpoint already registered for the same URL is updated in place rather
 * than duplicated.
 */
import Stripe from "stripe"

const url =
  process.env.WEBHOOK_URL ??
  "https://arifinoid-marketplace.vercel.app/api/stripe/webhook"

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("Missing STRIPE_SECRET_KEY in the environment")
  process.exit(1)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

/** `account.updated` is the v1 spelling; the handler understands both. */
const v2AccountEvents = [
  "v2.core.account[requirements].updated",
  "v2.core.account[configuration.merchant].updated",
  "v2.core.account[configuration.merchant].capability_status_updated",
]
const baseEvents = ["checkout.session.completed", "account.updated"]

/** Fall back to the v1 names if this platform rejects the v2 ones. */
async function register(events) {
  try {
    return await stripe.webhookEndpoints.create({
      url,
      connect: true,
      description: "Marketplace Connect payments",
      enabled_events: events,
    })
  } catch (error) {
    if (events === baseEvents) throw error
    console.log("v2 event names rejected, retrying with the v1 names only:")
    console.log(`  ${error.raw?.message ?? error.message}`)
    return register(baseEvents)
  }
}

const existing = await stripe.webhookEndpoints.list({ limit: 100 })
const match = existing.data.find((endpoint) => endpoint.url === url)

const endpoint = match
  ? await stripe.webhookEndpoints.update(match.id, {
      enabled_events: [...baseEvents, ...v2AccountEvents],
    })
  : await register([...baseEvents, ...v2AccountEvents])

console.log(`endpoint    ${endpoint.id}`)
console.log(`url         ${endpoint.url}`)
console.log(`status      ${endpoint.status}`)
console.log(`api_version ${endpoint.api_version ?? "(account default)"}`)
console.log(`events      ${endpoint.enabled_events.join(", ")}`)
console.log(
  `secret      ${endpoint.secret ?? "(not shown again — read it from the dashboard)"}`,
)
