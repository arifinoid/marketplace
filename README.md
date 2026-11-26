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
add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` as environment variables.
Work on a feature branch and open a PR; the user merges.

`vercel.json` pins functions to `hnd1` (Tokyo) so they run next to the Supabase
project. Change it if the database moves region.

## Performance

`GET /api/listings`, `GET /api/listings/[id]` and `/` are anonymously readable
and change only when someone posts, so they carry
`Cache-Control: public, s-maxage=10, stale-while-revalidate=59` and are served
from the Vercel CDN. The policy lives in `src/lib/api/cache-policy.ts`.
