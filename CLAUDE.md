# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Marketplace** — a Facebook Marketplace-style public board. No auth:
visitors create listings and message sellers. Done criteria live in `PLAN.md`;
the technical spec is `SPECS.md`; the design system is `DESIGN.md`; the database
is `DATABASE.md`.

Stack: Next.js 15 (App Router, Turbopack) · React 19 · TypeScript strict ·
Tailwind CSS v4 · shadcn/ui (`base-nova`, `@base-ui/react`) · `@supabase/supabase-js`
(server-only) · Vitest. Deploy target: Vercel.

## Commands

```bash
npm install          # install dependencies
npm run dev          # dev server with Turbopack (http://localhost:3000)
npm run build        # production build (next build --turbopack)
npm run start        # serve the production build
npm run lint         # ESLint 9 flat config (eslint.config.mjs)
npm run typecheck    # tsc --noEmit
npm test             # Vitest run — pure logic unit tests
npm run test:watch   # Vitest in watch mode
```

Run `npm run typecheck`, `npm run lint` and `npm test` before committing; run
`npm run build` before deploying.

## Architecture rules

- **The browser only calls `/api/*`.** Never import the Supabase client into a
  component — keys stay server-side and the API is the single validation
  boundary.
- **Route handlers are thin:** parse → validate (`src/lib/**/validation.ts`) →
  query (`src/lib/**/queries.ts`) → response (`src/lib/api/response.ts`). No
  business rules or JSX inline.
- **Pure logic stays pure.** `validation.ts`, `types.ts`, `format.ts`, and
  `queries.ts` have no React/Next imports and are unit tested. UI-shaped code
  belongs in `src/components/**`.
- **No global state library.** Local `useState`/`useEffect` plus the fetch
  wrapper in `src/lib/api/client.ts`. Do not add Context, Zustand, or Redux.
- **Derive `seller_email` server-side** when inserting a message (look it up from
  the listing); never trust it from the client.
- **Money** is `numeric(10,2)`; format with `Intl.NumberFormat`, never float
  math.
- **Tailwind v4:** theme tokens live in `@theme` in `src/app/globals.css`. Do
  **not** create `tailwind.config.js`.
- shadcn primitives are in `src/components/ui`; `cn()` comes from `@/lib/utils`.
  Path alias `@/*` → `src/*`.
- TypeScript strict; no `any`.
- All code — comments, API/CLI messages, UI copy, test titles — is **English**.
  Docs may be English too.

## Database

`DATABASE.md` is the source of truth — apply its SQL in the Supabase editor.
RLS is enabled on every table; the `anon` role gets **SELECT + INSERT** only
(`categories`, `listings`, `messages`, and the `listing-images` storage bucket).
There are intentionally no UPDATE/DELETE policies (no auth). Never put a
service-role key in this repo; use `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY`
from `.env.local` (server-only, gitignored).

## Conventions

- Design tokens and per-screen layout are in `DESIGN.md`; palette is Facebook
  blue `#1877F2` on canvas `#edf0f5`, surface `#ffffff`, border `#ccd0d5`.
- Accessibility: labelled inputs, real buttons, focus-visible rings, `aria-live`
  for async feedback, `prefers-reduced-motion` respected.

## Skills

Project skills live in `.agents/skills/` and are pinned by `skills-lock.json`:

- `supabase`, `supabase-postgres-best-practices` — load before any schema, RLS,
  migration, index, or Supabase client work.
- `stripe-connect` — load before any Stripe work: Connect onboarding, direct
  charges, application fees, Checkout, webhook signature verification.
- `better-accessibility`, `better-colors`, `better-layout`, `better-motion`,
  `better-typography`, `better-ui`, `better-interface`, `better-writing`,
  `interface-review`, `build-design` — design review for UI work.

These are project skills (not auto-loaded from `~/.claude/skills`); read the
relevant `SKILL.md` before starting the matching milestone.

## Testing

- Vitest, **node** environment, colocated `src/lib/**/*.test.ts` (validation,
  formatting, query building, upload guards). `vitest.config.mts` mirrors the
  `@` alias. Playwright e2e is optional/stretched.

## CI & deploy

- `.github/workflows/ci.yml` runs typecheck, lint, unit tests, and build on
  push/PR.
- Vercel import from the GitHub default branch; build command `npm run build`;
  add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in the Vercel dashboard.
- Work on a feature branch and open a PR; the user merges. Do not merge to
  `main` yourself.
