# PLAN.md — Marketplace

A Facebook Marketplace-inspired board. No authentication: a visitor can post a
listing and message a seller, and everything is public.

Inspiration: Facebook Marketplace. Mockups: `assets/images/image*.png`.

**Status:** M1 (foundation) done — Next.js 15 + Tailwind v4 + shadcn `base-nova`
scaffold, theme tokens, and app shell (sidebar + header) verified with
typecheck / lint / build / SSR smoke.

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

Each milestone ends on a working app; M3–M6 are the four done criteria.

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
