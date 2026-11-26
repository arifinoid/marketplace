---
name: stripe-connect
description: "Use when doing ANY task involving Stripe in this project. Triggers: Stripe Connect, connected accounts, Express onboarding, account links, Checkout sessions, direct charges, application fees, platform fee, payouts, webhook signature verification, webhook endpoints, Stripe sandbox / test mode / test keys, and the STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variables. Load before adding a payment route, a webhook handler, or any seller payout logic."
metadata:
  author: marketplace
  version: 0.1.0
---

# Stripe Connect

## Core Principles

- **The secret key is server-only.** It lives in `STRIPE_SECRET_KEY`, is read in
  `src/lib/stripe/server.ts`, and must never be imported by a component, a
  client module, or prefixed `NEXT_PUBLIC_`. Only the publishable key is public.
  Never commit a secret key; `.env.local` is gitignored, but a leaked key in a
  PR is still a leak.
- **Money is integer cents.** The database stores `numeric(10,2)`; convert once
  at the boundary (`Math.round(Number(price) * 100)`) and do every fee
  calculation in cents. Never use float math for money.
- **A webhook body must be read raw.** Signature verification is over the exact
  bytes Stripe sent. In a Next.js route handler use `await request.text()`, not
  `await request.json()`. Calling `json()` first destroys the signature.
- **Webhooks are idempotent.** `orders.checkout_session_id` is unique; a retried
  event must not create a second order. Upsert on that key, or return early when
  the order already exists.
- **The sandbox is shared.** The test keys belong to a platform other candidates
  also use, so the endpoint receives events for accounts and checkouts that are
  not ours. Ignore anything unrecognised and still return `200` — an error tells
  Stripe to retry.
- **Never block on a slow dependency.** Handle the event, return `200`, and keep
  the database work small. Stripe retries non-2xx responses.

## Connect Model Used Here

Express accounts, direct charges.

- **Express** — Stripe owns KYC and the onboarding UI. The seller clicks an
  account link, finishes onboarding on Stripe's pages, and is redirected back.
  This is the fastest path and needs no PCI work from us.
- **Direct charge** — the Checkout Session is created *on the connected
  account* (pass `{ stripeAccount }` as the request options) and carries
  `payment_intent_data.application_fee_amount`. The buyer sees one combined
  charge and the platform fee is deducted from the seller's payout.
- Direct charges emit events from the **connected account**, so the webhook
  endpoint must be registered with `connect: true`. A destination charge would
  emit from the platform and needs `connect: false`.

## Recipes

### Create a connected account and an onboarding link

```ts
const account = await stripe.accounts.create({
  type: "express",
  country: "US",
  email,
  business_type: "individual",
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
})

const link = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: `${baseUrl}/connect?refresh=1`,
  return_url: `${baseUrl}/connect?step=done`,
  type: "account_onboarding",
})
// send the seller to link.url
```

Store `account.id` against `seller_email` in `stripe_accounts`. Onboarding is
complete when `charges_enabled` is true, which arrives via `account.updated` and
can also be re-checked with `stripe.accounts.retrieve()`.

### A direct charge through Checkout

```ts
const session = await stripe.checkout.sessions.create(
  {
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          product_data: { name: listing.title },
          unit_amount: amountCents,
        },
      },
    ],
    payment_intent_data: { application_fee_amount: feeCents },
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/checkout/cancel`,
    metadata: { listingId: listing.id, orderId: order.id },
  },
  { stripeAccount: sellerAccount.stripe_account_id },
)
```

`{CHECKOUT_SESSION_ID}` is substituted by Stripe and lets the success page read
the session back. Do **not** set `transfer_data` on a direct charge.

### The webhook route

```ts
export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")
  if (!signature) return new Response("Missing signature", { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET ?? "",
    )
  } catch {
    return new Response("Invalid signature", { status: 400 })
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      const orderId = session.metadata?.orderId
      if (!orderId) return new Response("Ignored", { status: 200 }) // not ours
      await markOrderPaid(orderId, session.id)
      return new Response("ok", { status: 200 })
    }
    case "account.updated": {
      const account = event.data.object as Stripe.Account
      await syncAccount(account) // unknown accounts are ignored
      return new Response("ok", { status: 200 })
    }
    default:
      return new Response("Ignored", { status: 200 })
  }
}
```

### Register the endpoint (once, production only)

```bash
node --env-file=.env.local scripts/create-webhook.mjs
```

The script calls `stripe.webhookEndpoints.create({ url, connect: true,
enabled_events: ["checkout.session.completed", "account.updated"] })` and
prints the signing secret, which is shown once. Register the **production**
Vercel URL — preview deployments are login-protected, so Stripe cannot reach
them.

## Environment

| Variable | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | browser | safe to expose |
| `STRIPE_SECRET_KEY` | server only | never commit, never client |
| `STRIPE_WEBHOOK_SECRET` | server only | `whsec_...`, printed once |
| `NEXT_PUBLIC_STRIPE_FEE_BPS` | browser | optional display override, default 1000 (10%) |

## Pitfalls

- **Preview URLs cannot receive webhooks.** Vercel password-protects them.
- **`charges_enabled` lags onboarding.** Do not offer Buy Now until it is true,
  and re-check it when `/connect` loads — the redirect back can beat the webhook.
- **A shared sandbox means foreign events.** Filter on `metadata.orderId` and on
  a `stripe_account_id` we stored; never trust an event just because it arrived.
- **Test cards.** `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP.
  Connect onboarding needs Stripe's published test identity and bank details.
- **Express onboarding requires a `country`.** Mismatch with the seller's real
  country fails late in onboarding; `US` matches the sandbox defaults.
- **The fee must be passed in cents and must be ≤ the charge.** A fee larger than
  `unit_amount` is rejected by Stripe.
- **Idempotency is mandatory.** Stripe retries events; a duplicate
  `checkout.session.completed` must not mark a second order or double-charge the
  seller's payout record.
- **Do not add UPDATE policies to `listings`** to store "sold". Sold is derived
  from a paid `orders` row, which keeps the no-auth RLS model intact.

## Reference

- Connect overview — https://stripe.com/docs/connect
- Testing Connect — https://stripe.com/docs/connect/testing
- Test cards — https://stripe.com/docs/testing
- Webhooks — https://stripe.com/docs/webhooks
