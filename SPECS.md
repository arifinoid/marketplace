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

`.env.local` (gitignored). The browser never talks to Supabase directly, so all
Supabase variables are **server-only** — do not prefix them with `NEXT_PUBLIC_`.

```bash
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>
```

Never commit a service-role key. The anon key + RLS is enough because the
policies grant `anon` read + insert.

## Architecture

```
src/
  app/
    layout.tsx                 # app shell: sidebar + header
    page.tsx                   # /            browse (grid + filter + search)
    globals.css                # @theme tokens
    create/page.tsx            # /create      listing-type picker
    create/item/page.tsx       # /create/item create form + preview
    item/[id]/page.tsx         # /item/[id]   detail + message seller
    api/
      listings/route.ts        # GET, POST
      listings/[id]/route.ts   # GET
      messages/route.ts        # GET, POST
      upload/route.ts          # POST (multipart image → Storage)
  components/
    ui/                        # shadcn primitives
    layout/                    # sidebar, header, category-nav
    marketplace/               # listing-card, listing-grid, listing-form,
                               # message-form, photo-upload, states
  lib/
    supabase/server.ts         # server Supabase client (singleton)
    api/client.ts              # browser fetch wrapper for /api/*
    api/response.ts            # json() / error() helpers
    listings/{types,validation,queries,format}.ts
    messages/{types,validation}.ts
    categories.ts              # slug <-> name helpers
    utils.ts                   # cn()
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

Pure functions in `src/lib/{listings,messages}/validation.ts`, unit tested.

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

Money is stored as `numeric(10,2)`; format with `Intl.NumberFormat('en-US', {
style: 'currency', currency: 'USD' })` in `format.ts`, never with float math.

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
- **Sidebar** — logo + "Marketplace", then the 19 categories as nav links
  (`/?category=<slug>`). Active category is highlighted. On mobile the sidebar
  collapses into a drawer/hamburger.
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
  and the **Message Seller** form. Submit = `POST /api/messages`; success shows
  an inline confirmation and clears the form.
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
- Out of scope / accepted risk: no rate limiting or abuse controls (no auth).

## Testing

- **Vitest**, `node` environment, colocated `src/lib/**/*.test.ts`:
  - listing validation (boundaries, price decimals, category slugs)
  - message validation
  - price/date formatting
  - query building (category filter, search, ordering, pagination)
  - upload mime/size guard
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
- Gate: `npm run typecheck && npm run lint && npm test`; `npm run build` before
  deploy.

## CI & deploy

- `.github/workflows/ci.yml` runs typecheck, lint, unit tests, and build on
  push/PR.
- Vercel import from the GitHub default branch; build command `npm run build`;
  add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in the Vercel dashboard.
- Production URL is the public entry point (`https://<project>.vercel.app`).
- Work on a feature branch, open a PR, the user merges. Do not merge to `main`.
