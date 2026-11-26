# Marketplace

A Facebook Marketplace-style public board. No authentication: visitors
post listings with a photo and message sellers. Built with Next.js 15, Supabase,
and Tailwind CSS v4.

## Done criteria

1. Create a listing with a photo, title, description, price, email, and category
   → saved in Supabase.
2. Home shows all listings with category filtering.
3. Each listing has its own page with photo and full details.
4. **Message Seller** saves the buyer's message in Supabase.

Bonus: keyword search, email the seller on message.

**Live:** <https://arifinoid-marketplace.vercel.app/>

## Stripe Connect (Test 4)

Sandbox only — the platform's test keys, no real money, no real payouts. A
seller connects a Stripe account from `/connect`, their listings get a **Buy
Now** button, and a `4242 4242 4242 4242` payment is a direct charge on that
account with a 10% platform fee. The order is recorded by the webhook and the
listing shows as **Sold**.

```bash
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are server-only, like the
Supabase pair. Register the Connect endpoint against the **production** URL
(`/api/stripe/webhook`) — Vercel protects preview deployments, so Stripe cannot
reach them:

```bash
node --env-file=.env.local scripts/create-webhook.mjs
```

The script prints the signing secret, which is shown once. Subscribe to `checkout.session.completed`, `account.updated`, and the
`v2.core.account[requirements].updated` /
`v2.core.account[configuration.merchant]*` events — accounts are created through
Accounts v2, and Stripe may deliver an account change under either the v1 or the
v2 name depending on how the destination was registered. The handler verifies
the signature against the raw body and branches between classic v1 events and
thin v2 notifications, which need different SDK calls.

## Quick start

```bash
npm install
printf 'SUPABASE_URL=\nSUPABASE_PUBLISHABLE_KEY=\n' > .env.local  # then fill in both
npm run dev                  # http://localhost:3000
```

`.env.local` is gitignored. Both values come from the Supabase dashboard
(Project Settings -> API) and stay server-only — never prefix them with
`NEXT_PUBLIC_`:

```bash
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>
```

Apply `DATABASE.md` in the Supabase SQL editor before creating listings.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:e2e` | Playwright end-to-end tests |

Gate before committing: `npm run typecheck && npm run lint && npm test`.
Run `npm run build` before deploying.

## End-to-end tests

`tests/e2e/` drives a real browser through the four done criteria: browse,
category filter, open a listing, message the seller, and create a listing with a
photo.

They need a server and a real database:

```bash
npm run test:e2e                                # starts `npm run dev` itself
E2E_BASE_URL=https://arifinoid-marketplace.vercel.app/ npm run test:e2e
```

`.env.local` must be present, and the tests write real rows — the schema has no
DELETE policy, so expect them to accumulate. `.github/workflows/e2e.yml` runs
them on demand with `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` as secrets.

The Stripe part is covered without moving money: the tests check that `/connect`
is reachable, that a listing whose seller has not connected shows no Buy Now
card, and that both checkout pages 404 without a `session_id`. A real payment
needs a seller to finish onboarding in the sandbox first.

## Docs

| Doc | Purpose |
|-----|---------|
| [`PLAN.md`](./PLAN.md) | Requirements, scope, milestones |
| [`SPECS.md`](./SPECS.md) | Technical spec, API contract, validation, testing |
| [`DESIGN.md`](./DESIGN.md) | Design system and screens |
| [`DATABASE.md`](./DATABASE.md) | Supabase schema, RLS, storage |
| [`CLAUDE.md`](./CLAUDE.md) | Guidance for Claude Code |

## Deploy

Vercel import from the GitHub default branch; build command `npm run build`;
add `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY` and
`STRIPE_WEBHOOK_SECRET` as environment variables.
Work on a feature branch and open a PR; the user merges.

`vercel.json` pins functions to `hnd1` (Tokyo) so they run next to the Supabase
project. Change it if the database moves region.

## Performance

`GET /api/listings` is anonymously readable and changes only when someone
posts, so it carries
`Cache-Control: public, s-maxage=10, stale-while-revalidate=59` and is cached
by the Vercel CDN. The policy lives in `src/lib/api/cache-policy.ts`.
`GET /api/listings/[id]` is **not** cached — since Test 4 it also reports
`sold` and `sellerReady`, which change the moment a payment lands.

```bash
curl -sD - -o /dev/null \
  https://arifinoid-marketplace.vercel.app/api/listings?category=electronics
```

`x-vercel-cache` goes `MISS` → `HIT` (then `STALE` once the 10s freshness
expires) and `x-vercel-id` shows `hnd1`, because `vercel.json` pins the
functions to Tokyo next to the Supabase project. Measured from Jakarta: a cold
request is ~0.3s and a cached one ~0.1s, down from 1.2–1.7s before the region
and cache work.

`/` is rendered per request (`force-dynamic`, so the CDN does not cache it) and
answers in ~0.3s. Caching it would need incremental static regeneration, which
is deliberately not used because the build must not touch Supabase.
