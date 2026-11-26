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
cp .env.example .env.local   # then fill in SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY
npm run dev                  # http://localhost:3000
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

Gate before committing: `npm run typecheck && npm run lint && npm test`.
Run `npm run build` before deploying.

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
