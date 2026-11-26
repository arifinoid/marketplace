# PLAN.md — Marketplace

A Facebook Marketplace-inspired board. No authentication: a visitor can post a
listing and message a seller, and everything is public.

Inspiration: Facebook Marketplace. Mockups: `assets/images/image*.png`.

**Status:** M1 + M2 + M3 + M4 + M5 + M6 + M7 + M8 done; Test 4 (Stripe
Connect) planned as M9–M12 below. Live at
<https://arifinoid-marketplace.vercel.app/>.

- **M1** — Next.js 15 + Tailwind v4 + shadcn `base-nova` scaffold, theme tokens,
  app shell (sidebar + header). Verified: typecheck / lint / build / SSR smoke.
- **M2** — Supabase data layer: `supabase/schema.sql`, lazy server client,
  domain types, pure validation + formatting, query builders, API client /
  response helpers, and 22 unit tests. Verified: typecheck / lint / tests /
  build. Live DB calls still need `.env.local` + the schema applied.
- **M3** — API routes: `/api/listings` (GET, POST), `/api/listings/[id]` (GET),
  `/api/messages` (GET, POST), `/api/upload` (POST). Pure query/upload guards
  + 20 unit tests (42 total). Verified: typecheck / lint / tests / build /
  HTTP smoke (400 / 413 / 415 / 500 envelopes). Live DB calls still need
  `.env.local` + the schema applied.
- **M4** — Browse: server-rendered first grid, client refetch on category /
  debounced keyword search, listing card, skeleton / empty / error states with
  retry. Verified: typecheck / lint / tests / build; end-to-end against a local
  mock Supabase (grid, `?category=` filter + heading, `?q=` search). Real
  Supabase still needs `.env.local` + the schema applied.
- **M5** — Create: `/create` type picker (only *Item for sale* enabled) and the
  `/create/item` three-pane form (details, live preview, summary) with photo
  upload through `/api/upload`. Client validation mirrors the server rules;
  submit posts the listing and redirects to `/item/[id]`. Verified live: upload
  `201` + public URL fetch `200`, `POST /api/listings` `201`, home grid renders
  the new card.
- **M6** — Detail & message: `/item/[id]` with photo, price, description,
  location, listed-ago and seller information, plus the message form. Submit
  calls `POST /api/messages`, which derives `seller_email` from the listing.
  Unknown or malformed ids hit the custom `app/not-found.tsx` with a real `404`.
  Verified live: detail `200`, message `201` with the derived recipient, message
  list `200`, unknown listing `404`.
- **M7** — Verify: the four gates (`typecheck`, `lint`, unit tests, `build`) plus
  an HTTP smoke matrix against the real Supabase project, and a CI workflow
  (`.github/workflows/ci.yml`) that runs the same gates on push/PR. Verified:
  typecheck clean, lint exit 0, 42/42 tests, build clean, 17/17 smoke checks as
  expected. Deploy still pending (Vercel import from the default branch).
- **M8** — Docs: the environment-variable template, the live URL in
  `README.md` / `SPECS.md`,
  and the function-region note in `vercel.json`. Verified live: 9/9 smoke checks
  on the production URL (pages `200`, unknown and malformed ids `404`, API `200`
  / `400`).
- **Post-M8** — Fix a regression from the latency work (#9): `?category=` returned
  every listing, because a PostgREST embed is a left join and the filter only
  nulled out the embed. `listListings` now selects `categories!inner(...)`; a new
  unit test pins the built query. Verified: 45/45 unit tests, 3/3 e2e against
  the deployed site, and `/api/listings?category=<slug>` returns only rows whose
  embedded category matches. Counts are not fixed: e2e writes rows and there is
  no DELETE policy, so a category that is empty today may not be tomorrow
  (Vehicles went 0 → 1 on 2026-11-26).

## Stripe Connect (M9–M12)

Add payments to the M1–M8 board. Sandbox only — the platform's test keys are
used and no real money moves.

**Done when all four work on the live site:**

1. A seller finishes Stripe onboarding from a "Connect with Stripe" page.
2. That seller's listings show a **Buy Now** button that opens Stripe Checkout.
3. A `4242 4242 4242 4242` payment succeeds and the seller is paid minus the
   platform fee (10%).
4. The buyer sees a success page, the order is saved in Supabase, and the
   listing shows as **Sold**.

**Decisions:** Express connect accounts; direct charge on the connected account
with `application_fee_amount`; the seller is identified by the `seller_email` on
their listings (still no auth); Sold is derived from a paid `orders` row, so
`listings` needs no UPDATE policy.

- **M9** — Stripe foundation: `stripe` SDK, a server-only client, money/fee
  helpers, unit tests. Verified: 54/54 unit tests, typecheck / lint / build.
- **M10** — Seller onboarding: `stripe_accounts` table, `/connect`,
  `POST /api/connect/account-link`, `GET /api/connect/status`, the
  `account.updated` webhook, and the sidebar entry.
- **M11** — Checkout: `orders` table, Buy Now, `POST /api/checkout`,
  `/checkout/success` + `/checkout/cancel`, the `checkout.session.completed`
  webhook, and the Sold badge.
- **M12** — Docs, verification and submission: `PLAN.md` / `SPECS.md` /
  `DESIGN.md` / `DATABASE.md`, screenshots, the four gates plus e2e, and the
  apply.capm.us form.

## Done criteria

The build passes when all four work on the live site:

1. A visitor can create a listing with a photo, title, description, price,
   email, and category, and it is saved in Supabase.
2. The home page shows all listings, with category tabs/sidebar to filter them.
3. Each listing has its own page with the photo and full details.
4. **Message Seller** saves the buyer's message in Supabase.

Bonus (optional): keyword search; email the seller when a message arrives.

## Functional requirements

- **Create listing** — upload a photo, fill title / description / price / email /
  category, save to Supabase.
- **Browse & filter** — responsive grid of all listings, newest first; filter by
  category from the sidebar. Keyword search is a bonus.
- **Listing detail** — dedicated page per item: photo, title, price, description,
  location, seller contact, and a **Message Seller** action.
- **Message seller** — store buyer messages in Supabase. Bonus: also email the
  seller.

## Non-goals (this iteration)

- Accounts, login, sessions, or ownership.
- Edit / delete / mark-as-sold listings.
- Multiple photos per listing, payments, real-time chat, reviews, moderation.
- Search beyond a simple keyword match.

## Milestones

| # | Milestone | Deliverable |
|---|-----------|-------------|
| M1 | Foundation | `create-next-app` (TS, Tailwind v4, App Router, `src/`), shadcn `base-nova` init, theme tokens, app shell (sidebar + header). |
| M2 | Data layer | `DATABASE.md` applied, `src/lib/supabase/server.ts`, domain types, category seed. |
| M3 | API | `/api/listings`, `/api/listings/[id]`, `/api/messages`, `/api/upload` with validation + unit tests. |
| M4 | Browse | Home grid, category filter (`/?category=`), keyword search, listing card, loading / empty / error states. |
| M5 | Create | `/create` type picker, `/create/item` form, photo upload, live preview, submit. |
| M6 | Detail & message | `/item/[id]`, message form, success / error feedback. |
| M7 | Verify | `typecheck`, `lint`, unit tests, `build`, e2e smoke, deploy. |
| M8 | Docs | `README.md`, `CLAUDE.md`, this plan. |
| M9 | Stripe foundation | `stripe` SDK, server-only client, money/fee helpers, unit tests. |
| M10 | Seller onboarding | `stripe_accounts`, `/connect`, account-link API, `account.updated` webhook. |
| M11 | Checkout | `orders`, Buy Now, `/api/checkout`, success page, Sold state. |
| M12 | Verify & submit | Docs, screenshots, gates + e2e, apply.capm.us. |

Each milestone ends on a working app; M3–M6 are the four done criteria, and
M9–M12 are the four Stripe criteria above.

## Quality gates

- `npm run typecheck`, `npm run lint`, `npm test` before every commit.
- `npm run build` before deploying.
- Work on a feature branch; open a PR; the user merges. Do not merge to `main`.

## Documents

| Doc | Purpose |
|-----|---------|
| `SPECS.md` | Technical spec: stack, architecture, API contract, validation, testing, deploy. |
| `DESIGN.md` | Design system and per-screen layout, extracted from the mockups. |
| `DATABASE.md` | Supabase schema (tables, RLS, storage, seed). |
| `CLAUDE.md` | Guidance for Claude Code working in this repo. |
