# SPECS.md — Technical Specification

Facebook Marketplace clone. No auth, public board.

## Stack

- **Next.js 15** (App Router, Turbopack) on **React 19**
- **TypeScript** strict, no `any`
- **Tailwind CSS v4** — theme tokens in `@theme` in `src/app/globals.css`;
  **no** `tailwind.config.js`
- **shadcn/ui** (`base-nova` style, `@base-ui/react`) in `src/components/ui`
- **lucide-react** icons
- **@supabase/supabase-js** — server-side only
- **Vitest** unit tests; **Playwright** e2e (optional, stretched)
- Deploy target: **Vercel**

Path alias: `@/*` → `src/*`. `cn()` from `@/lib/utils`.

## Environment

`.env.local` (gitignored) holds the two variables below. The browser never talks
to Supabase directly, so all Supabase variables are **server-only** — do not
prefix them with `NEXT_PUBLIC_`.

```bash
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>

# Stripe (Test 4). The secret key stays server-only; the webhook secret is the
# `whsec_...` value from the Stripe dashboard or `stripe listen`.
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
# Optional. Overrides the request host when building absolute URLs (Connect
# account links, Checkout return URLs) on a deployment whose forwarded host is
# not the public one.
NEXT_PUBLIC_APP_URL=https://<public-host>
```

Never commit a service-role key or a Stripe secret key. The anon key + RLS is
enough for Supabase because the policies grant `anon` read + insert.

## Architecture

```
src/
  app/
    layout.tsx                 # app shell: sidebar + header
    page.tsx                   # /            browse (grid + filter + search)
    globals.css                # @theme tokens
    create/page.tsx            # /create      listing-type picker
    create/item/page.tsx       # /create/item create form + preview
    item/[id]/page.tsx         # /item/[id]   detail + buy + message seller
    connect/page.tsx           # /connect     Stripe onboarding
    checkout/success/page.tsx  # /checkout/success
    checkout/cancel/page.tsx   # /checkout/cancel
    api/
      listings/route.ts        # GET, POST
      listings/[id]/route.ts   # GET
      messages/route.ts        # GET, POST
      upload/route.ts          # POST (multipart image → Storage)
      checkout/route.ts               # POST (listing + email → Checkout URL)
      connect/account-link/route.ts  # POST (email → Stripe onboarding URL)
      connect/status/route.ts        # GET  (?email= → onboarding state)
      stripe/webhook/route.ts        # POST (Connect webhook)
  components/
    ui/                        # shadcn primitives
    layout/                    # sidebar, header, category-nav, connect-stripe-button
    marketplace/               # listing-card, listing-grid, listing-form,
                               # message-form, photo-upload, states
    connect/                   # connect-card (client)
  lib/
    supabase/server.ts         # server Supabase client (singleton)
    api/client.ts              # browser fetch wrapper for /api/*
    api/response.ts            # json() / error() helpers
    api/origin.ts              # public origin for absolute URLs
    listings/{types,validation,queries,format}.ts
    messages/{types,validation}.ts
    connect/{types,validation,queries,onboarding,account-flags,account-status}.ts
    orders/{types,validation,queries,checkout}.ts
    stripe/{server,money,event-notification}.ts # SDK client, cent math, thin-event check
    categories.ts              # slug <-> name helpers
    utils.ts                   # cn()
scripts/
  create-webhook.mjs           # register the Connect endpoint, print whsec_…
  checkout-e2e.mjs             # real 4242 payment against a deployed site
```

Rules:

- **The browser only calls `/api/*`.** Components never import the Supabase
  client. This keeps keys server-side and gives one validation boundary.
- **Pure logic stays pure.** `validation.ts`, `types.ts`, `format.ts`,
  `queries.ts` (query building only) have no React/Next imports and are unit
  tested.
- **Route handlers are thin:** parse → validate → call a `lib` query → format
  response. No UI, no business rules inline.
- **State management is local.** `useState`/`useEffect` + a small fetch hook.
  No Context, Zustand, or Redux.

## Data model

See `DATABASE.md` for the SQL. Summary:

- `categories(id, slug, name, sort_order)` — fixed 19-row seed.
- `listings(id, title, description, price, category_id → categories, seller_email,
  image_url, location, created_at, updated_at)`
- `messages(id, listing_id → listings on delete cascade, buyer_email,
  seller_email, message, created_at)`
- `stripe_accounts(id, seller_email unique, stripe_account_id unique, created_at)`
  — one Connect account per seller email.
- `stripe_account_events(id, stripe_account_id, charges_enabled,
  details_submitted, payouts_enabled, created_at)` — append-only onboarding
  state; the newest row wins.
- `orders(id, listing_id → listings on delete cascade, buyer_email,
  stripe_checkout_session_id unique, stripe_account_id, amount_cents, fee_cents,
  currency, status, created_at)` — a row is a paid checkout. Sold is derived
  from its existence; `listings` never gets an UPDATE policy.
- Storage bucket `listing-images` (public).

`location` is a constant default (`'Palo Alto, CA'`), not a form field.

## API contract

Base URL: same origin. All responses are JSON. Errors use
`{ "error": { "code": string, "message": string } }`.

| Method | Path | Query / body | Success | Errors |
|--------|------|--------------|---------|--------|
| GET | `/api/listings` | `?category=<slug>&q=<text>&limit=<n>&offset=<n>` | `200 { data: Listing[], total: number }` | 400 |
| GET | `/api/listings/[id]` | — | `200 { data: Listing }` | 400, 404 |
| POST | `/api/listings` | JSON body (below) | `201 { data: Listing }` | 400, 500 |
| GET | `/api/messages` | `?listing_id=<uuid>` | `200 { data: Message[] }` | 400 |
| POST | `/api/messages` | JSON body (below) | `201 { data: Message }` | 400, 404, 500 |
| POST | `/api/upload` | multipart form, field `file` | `201 { data: { url } }` | 400, 413, 415 |
| POST | `/api/checkout` | JSON `{ listing_id, buyer_email }` | `200 { data: { url } }` | 400, 409, 500 |
| POST | `/api/connect/account-link` | JSON `{ email }` | `200 { data: { url } }` | 400, 500 |
| GET | `/api/connect/status` | `?email=<email>` | `200 { data: ConnectStatus }` | 400, 500 |
| POST | `/api/stripe/webhook` | raw Stripe body + `stripe-signature` | `200 "ok"` | 400, 500 |

### POST `/api/checkout` body

```json
{
  "listing_id": "<uuid>",
  "buyer_email": "buyer@example.com"
}
```

The seller is never taken from the client: the route loads the listing, reads
its `seller_email`, and looks up that seller's Connect account. `409` means the
listing is gone, already sold, or the seller has not finished onboarding — the
message says which.

### POST `/api/connect/account-link` body

```json
{ "email": "wei@example.com" }
```

The email is trimmed and lowercased, then used to create (or reuse) a Connect
account through **Accounts v2** (`dashboard: "express"`,
`defaults.responsibilities.losses_collector: "stripe"`). The v1 `type` field is
rejected by this platform, which requires Stripe to hold the loss liability.
The response `url` is a Stripe-hosted onboarding link (`v2/core/account_links`,
`use_case.type: "account_onboarding"`, `collection_options.fields:
"eventually_due"`) whose `return_url` / `refresh_url` point back at
`/connect?step=done|refresh&email=…`.

Accounts v2 has no `charges_enabled` boolean. `readAccountFlags`
(`connect/account-flags.ts`) translates the account into the three flags the
schema stores: `charges_enabled` from the `card_payments` capability status,
`payouts_enabled` from whether a requirement still restricts
`stripe_balance.payouts`, and `details_submitted` from whether any requirement
is still awaiting action from the seller.

### `GET /api/connect/status` response

```json
{
  "data": {
    "email": "wei@example.com",
    "connected": true,
    "chargesEnabled": true,
    "detailsSubmitted": true,
    "payoutsEnabled": true
  }
}
```

`connected` is false when no account row exists yet; the flags come from the
newest `stripe_account_events` row.

### POST `/api/stripe/webhook`

Registered as a **Connect** endpoint (`connect: true`), because direct charges
emit their events from the connected account. The handler reads the body as
text, because both verification helpers check the signature against the exact
bytes. It branches on `isThinEventNotification(body)`
(`src/lib/stripe/event-notification.ts`): a `v2.core.event` payload goes to
`parseEventNotification`, anything else to `webhooks.constructEvent` — the
latter rejects a thin notification outright. Events handled:
`v2.core.account[requirements].updated`,
`v2.core.account[configuration.merchant].updated`,
`v2.core.account[configuration.merchant].capability_status_updated`, and
`account.updated` — the v1 spelling of the same change, which some destination
configurations deliver instead (append flags for accounts this app created) —
plus `checkout.session.completed` (record the order). Unknown accounts are
dropped: the sandbox is shared, so the endpoint also receives events for other
candidates' sellers.

Accounts v2 events carry a `related_object` reference instead of the account
itself, so the handler re-reads the account from Stripe (`fetchAccountFlags`)
before appending a `stripe_account_events` row. A classic `account.updated`
carries the account in `data.object`; `readAccountId` accepts either.

The order handler reads `listingId` / `stripeAccountId` / `feeCents` from the
session **metadata**, which our own server wrote when it created the session —
the signature check is what makes that trustworthy. A session whose
`payment_status` is not `paid` (bank transfer, installments) is acknowledged and
ignored. `insertOrder` upserts on `stripe_checkout_session_id`, so a retried
event is a no-op; a `23505` from the one-paid-order-per-listing index returns
`null` instead of throwing, and the handler still answers `200`.

### POST `/api/listings` body

```json
{
  "title": "Bike 24 inch",
  "description": "Lightly used, new tires.",
  "price": 99,
  "category": "sporting-goods",
  "seller_email": "wei@example.com",
  "image_url": "https://<project>.supabase.co/storage/v1/object/public/listing-images/..."
}
```

### POST `/api/messages` body

```json
{
  "listing_id": "<uuid>",
  "buyer_email": "buyer@example.com",
  "message": "I want to buy your bike!"
}
```

`seller_email` is **not** accepted from the client. The route looks up the
listing and copies its `seller_email`, so a buyer cannot spoof the recipient.

## Validation rules

Pure functions in `src/lib/{listings,messages,connect}/validation.ts`, unit
tested.

| Field | Rule |
|-------|------|
| `title` | required, 3–255 chars |
| `description` | optional, ≤ 5000 chars |
| `price` | required, number, 0–99,999,999.99, ≤ 2 decimals |
| `category` | required, must be a seeded slug |
| `seller_email` / `buyer_email` | required, RFC-ish email (one `@`, valid domain shape) |
| `image_url` | required, `https:` URL (from `POST /api/upload`) |
| `message` | required, 1–2000 chars |
| `listing_id` | required, UUID, must exist |
| `email` (Connect) | required, RFC-ish email; trimmed + lowercased |
| `listing_id` (checkout) | required, UUID, must exist and be unsold |
| `buyer_email` (checkout) | required, RFC-ish email; trimmed + lowercased |

Money is stored as `numeric(10,2)`; format with `Intl.NumberFormat('en-US', {
style: 'currency', currency: 'USD' })` in `format.ts`, never with float math.
Stripe amounts are integer cents: `priceToCents` in `lib/stripe/money.ts` parses
digit by digit (never `parseFloat` or `* 100`), and the platform fee is
`amountCents * 1000 / 10000`, rounded.

## Image upload

`POST /api/upload`:

1. Parse multipart form data; require field `file`.
2. Validate mime ∈ {`image/jpeg`, `image/png`, `image/webp`} and size ≤ 5 MB.
3. Build a safe path: `listings/<uuid>/<sanitized-name>`.
4. Upload to the `listing-images` bucket with the server client.
5. Return the public URL.

The listing is created only after the upload succeeds (photo is required).

## Frontend behavior

- **`/`** — app shell (sidebar + header) and the listing grid. Reads
  `searchParams.category` and `searchParams.q`; refetches `/api/listings` on
  change. Search input is debounced (~300 ms). Newest first.
- **Sidebar** — logo + "Marketplace", then "Create new listing" and "Connect
  with Stripe", then the 19 categories as nav links (`/?category=<slug>`).
  Active category is highlighted. On mobile the sidebar collapses into a
  drawer/hamburger with the same two actions.
- **`/connect`** — email field → `POST /api/connect/account-link` → full-page
  redirect to Stripe. Returning with `?step=done&email=…` fetches
  `/api/connect/status` and shows either the connected panel or a
  "continue onboarding" form; `?step=refresh` shows the same form, since Stripe
  sends sellers back there when a link expires. The redirect back can beat the
  webhook, so `/api/connect/status` re-reads Stripe while the stored flags say
  charges are not enabled yet, and appends what it learns.
- **Listing card** — square photo, price, title (2-line clamp), location; links
  to `/item/[id]`.
- **`/create`** — "Choose listing type" with four cards (Item for sale, Create
  multiple listings, Vehicle for sale, Home for sale or rent). Only **Item for
  sale** is enabled and routes to `/create/item`; the rest are disabled with an
  "Unavailable" note (out of scope).
- **`/create/item`** — three-pane form (fields + preview + summary). Live
  preview updates as the user types; photo is chosen via the upload control.
  Submit = upload (if data URL / file not yet uploaded) → `POST /api/listings` →
  redirect to `/item/[id]`.
- **`/item/[id]`** — photo, title, price, description, location, seller email,
  the **Message Seller** form, and — only when the seller's account can accept
  charges (`charges_enabled`) and the listing is not sold — a **Buy Now** card. Buy Now
  validates the email, posts to `/api/checkout`, then redirects the buyer to
  Stripe; a `409` is shown inline instead of redirecting. A **Sold** badge sits
  next to the title and on the grid card.
- **`/checkout/success?session_id=…`** — confirmation plus the order amount,
  buyer and listing title. Stripe can redirect back before the webhook has
  recorded the order, so the page re-renders itself every 2 s (up to 10 times)
  and shows a "Confirming your payment…" state until the row lands.
- **`/checkout/cancel?session_id=…&listing_id=…`** — "You were not charged", with
  a link back to the listing. Both checkout pages 404 without a `session_id`.
- **Sold derivation** — `listListings` loads the sold flags in one extra query
  (`orders` where `status = paid`), `getListing` with a single existence check;
  there is no per-card query.
- **States** — skeleton/spinner while loading; empty state with guidance; inline
  error with retry; success via `aria-live="polite"`.

## Error handling

- API: correct status codes, JSON error envelope, never leak stack traces.
- Client: surface `error.message`; keep the form data on failure; disable submit
  while in flight.
- 404 page for unknown `/item/[id]` and unknown `/api/listings/[id]`.

## Security

- No service-role key; anon key + RLS only (see `DATABASE.md`).
- Server-side validation on every route; client validation is UX only.
- `seller_email` for messages is derived server-side from the listing.
- Upload mime/size enforced server-side; filenames sanitized.
- The Stripe secret key and `STRIPE_WEBHOOK_SECRET` are server-only, read from
  the environment, never from the client and never committed. The SDK client is
  behind `import "server-only"`.
- `/api/stripe/webhook` verifies the `stripe-signature` header against the raw
  body before doing anything; a missing or invalid signature is a `400`.
- Money never touches floats: `numeric(10,2)` in Postgres, integer cents at the
  Stripe boundary.
- The buyer never names the seller. `/api/checkout` derives `seller_email` from
  the listing, so a forged body cannot send the platform fee to another account.
- `orders` is INSERT-only: no refund or cancel path can rewrite a payment.
- `POST /api/checkout` is not cached and `/api/listings/[id]` stopped being
  CDN-cached, because both expose Sold / Buy-Now state that must be fresh.
- Out of scope / accepted risk: no rate limiting or abuse controls (no auth).

## Testing

- **Vitest**, `node` environment, colocated `src/lib/**/*.test.ts`:
  - listing validation (boundaries, price decimals, category slugs)
  - message validation
  - price/date formatting
  - query building (category filter, search, ordering, pagination)
  - upload mime/size guard
  - Stripe money math (string → integer cents, fee, payout, formatting; float traps)
  - Connect email validation and the onboarding query builders
  - checkout validation, and the order queries (upsert idempotency, the
    already-sold `23505` path, sold flags)
- `vitest.config.mts` mirrors the `@` alias.
- **Playwright**: `tests/e2e/marketplace.spec.ts` covers browse → category
  filter → detail → message seller, and create with a photo upload. Selectors
  use accessible roles and labels rather than `data-testid`, so the tests track
  the UI a visitor actually sees. Traces and screenshots are kept on failure.
- The e2e tests need a running server and a real Supabase project (`.env.local`),
  and they write real rows — there is no DELETE policy.
  `npm run test:e2e` starts the dev server itself; set `E2E_BASE_URL` to test a
  deployed environment instead. `.github/workflows/e2e.yml` runs them manually
  with the Supabase variables as repository secrets.
- `scripts/checkout-e2e.mjs` is the payment counterpart: it drives a real
  browser through Buy Now → hosted Checkout → `4242 4242 4242 4242`, then
  asserts the success page, the `orders` row (amount + 10% fee) and `sold`. It
  needs `PAY_SELLER_EMAIL` to point at a seller that already finished the
  Stripe-hosted onboarding, because that form is not automated. It writes
  screenshots to `docs/screenshots/`: `buy-now.png` (the listing with the Buy Now
  card), `checkout.png` (the hosted Checkout with the card filled),
  `checkout-success.png`, and `order-supabase.png` (the `orders` row read back
  from PostgREST). Run it with
  `node --env-file=.env.local scripts/checkout-e2e.mjs`; on NixOS also set
  `PAY_BROWSER_PATH` to a system browser and put an older `alsa-lib` on
  `LD_LIBRARY_PATH` (Playwright's bundled Chromium cannot resolve its dynamic
  linker there).
- Gate: `npm run typecheck && npm run lint && npm test`; `npm run build` before
  deploy.

## CI & deploy

- `.github/workflows/ci.yml` runs typecheck, lint, unit tests, and build on
  push/PR.
- Vercel import from the GitHub default branch; build command `npm run build`;
  add `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY` and
  `STRIPE_WEBHOOK_SECRET` in the Vercel dashboard (plus `NEXT_PUBLIC_APP_URL`
  if the forwarded host is not the public one).
- The Stripe webhook endpoint is registered **once**, against the production URL
  — Vercel preview URLs are login-protected, so Stripe cannot reach them.
  `scripts/create-webhook.mjs` does it and prints the signing secret, which is
  shown once; that value is `STRIPE_WEBHOOK_SECRET`. Test mode allows only 16
  endpoints per Stripe account, so registration can fail until a slot is freed
  (delete a `disabled` one).
- `vercel.json` pins functions to `hnd1` (Tokyo), next to the Supabase project in
  `ap-northeast-1`.
- Production URL is the public entry point
  (`https://arifinoid-marketplace.vercel.app/`).
- Work on a feature branch, open a PR, the user merges. Do not merge to `main`.
