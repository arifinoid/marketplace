# DATABASE.md — Supabase Schema

Source of truth for the database. Apply the SQL in the Supabase SQL editor
(Projects → SQL Editor → New query → paste → Run). Requires Postgres 15+ and
the `pgcrypto` extension for `gen_random_uuid()`.

The schema is intentionally small: a fixed category list, listings, messages,
Stripe Connect accounts, and one public storage bucket. There is **no auth** in
this iteration, so the only role that needs access is `anon` (the role mapped to
the publishable key).

## Tables

### `categories`

Fixed list shown in the sidebar and used to filter the grid. Seeded from the
mockup (`assets/images/image.png`). `slug` is what the UI/API use; `name` is the
display label; `sort_order` controls nav order.

| column       | type      | notes              |
|--------------|-----------|--------------------|
| `id`         | uuid      | PK, default `gen_random_uuid()` |
| `slug`       | text      | unique, not null   |
| `name`       | text      | not null           |
| `sort_order` | integer   | not null, default 0 |

### `listings`

| column        | type          | notes                                   |
|---------------|---------------|-----------------------------------------|
| `id`          | uuid          | PK, default `gen_random_uuid()`         |
| `title`       | varchar(255)  | not null                                |
| `description` | text          | nullable                                |
| `price`       | numeric(10,2) | not null, `check (price >= 0)`          |
| `category_id` | uuid          | not null, FK → `categories(id)` `on delete restrict` |
| `seller_email`| varchar(255)  | not null                                |
| `image_url`   | text          | not null (photo is required by the brief) |
| `location`    | varchar(255)  | not null, default `'Palo Alto, CA'`     |
| `created_at`  | timestamptz   | not null, default `now()`               |
| `updated_at`  | timestamptz   | not null, default `now()`               |

### `messages`

| column         | type        | notes                                        |
|----------------|-------------|----------------------------------------------|
| `id`           | uuid        | PK, default `gen_random_uuid()`              |
| `listing_id`   | uuid        | not null, FK → `listings(id)` `on delete cascade` |
| `buyer_email`  | varchar(255)| not null                                     |
| `seller_email` | varchar(255)| not null (copied from the listing server-side) |
| `message`      | text        | not null, `check (char_length(message) > 0)` |
| `created_at`   | timestamptz | not null, default `now()`                    |

### `stripe_accounts`

Test 4. Maps one seller email (the same one on their listings) to a Stripe
Connect account. `seller_email` and `stripe_account_id` are both unique, so a
retry cannot create a second account for one seller.

| column              | type         | notes                              |
|---------------------|--------------|------------------------------------|
| `id`                | uuid         | PK, default `gen_random_uuid()`    |
| `seller_email`      | varchar(255) | not null, unique                   |
| `stripe_account_id` | varchar(255) | not null, unique                   |
| `created_at`        | timestamptz  | not null, default `now()`          |

### `stripe_account_events`

Append-only log of the onboarding flags Stripe reported for a Connect account.
The newest row is the current state. It is a log rather than a column on
`stripe_accounts` so the schema stays INSERT-only — an UPDATE policy would let
anyone rewrite `stripe_account_id` and divert buyers' payments.

| column              | type         | notes                              |
|---------------------|--------------|------------------------------------|
| `id`                | uuid         | PK, default `gen_random_uuid()`    |
| `stripe_account_id` | varchar(255) | not null, no FK (unknown ids are dropped) |
| `charges_enabled`   | boolean      | not null, default `false`          |
| `details_submitted` | boolean      | not null, default `false`          |
| `payouts_enabled`   | boolean      | not null, default `false`          |
| `created_at`        | timestamptz  | not null, default `now()`          |

### `orders`

Test 4. A row here **is** a completed payment: the webhook inserts one only when
Stripe reports `payment_status = paid`. Sold is derived from the existence of a
row, which is why `listings` needs no UPDATE policy.

| column                    | type         | notes                                        |
|---------------------------|--------------|----------------------------------------------|
| `id`                      | uuid         | PK, default `gen_random_uuid()`              |
| `listing_id`              | uuid         | not null, FK → `listings(id)` `on delete cascade` |
| `buyer_email`             | varchar(255) | not null                                     |
| `stripe_checkout_session_id` | varchar(255) | not null, unique (idempotency key)        |
| `stripe_account_id`       | varchar(255) | not null, the Connect account that was paid  |
| `amount_cents`            | integer      | not null, `check (amount_cents >= 0)`       |
| `fee_cents`               | integer      | not null, `check (fee_cents >= 0)`          |
| `currency`                | char(3)      | not null, default `'usd'`                    |
| `status`                  | varchar(32)  | not null, default `'paid'`                   |
| `created_at`              | timestamptz  | not null, default `now()`                    |

A partial unique index on `(listing_id) where status = 'paid'` means one listing
can only be sold once, even if two buyers race or Stripe retries an event.

## Storage

One public bucket, `listing-images`, for listing photos. Uploads go through
`POST /api/upload`; the API route writes with the anon key, so the bucket needs
anon `insert` + `select` policies. There are deliberately no `update`/`delete`
policies (no auth → no ownership).

## Row Level Security

RLS is enabled on every table. The anon role gets **read + insert only**:

- `categories`: SELECT
- `listings`: SELECT, INSERT
- `messages`: SELECT, INSERT
- `stripe_accounts`: SELECT, INSERT
- `stripe_account_events`: SELECT, INSERT
- `orders`: SELECT, INSERT
- `storage.objects`: SELECT, INSERT (bucket `listing-images`)

No UPDATE/DELETE policies exist, including on the Stripe tables — onboarding
state is appended, never rewritten. If auth is added later, replace the blanket
insert policies with ownership checks (e.g. `seller_email = jwt claim`) and add
update/delete policies then.

## SQL

```sql
-- ============================================================================
-- Marketplace schema — Supabase / Postgres 15+
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------- Categories -----------------------------------------------------

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  sort_order integer not null default 0
);

insert into public.categories (slug, name, sort_order) values
  ('vehicles',            'Vehicles',            1),
  ('property-rentals',    'Property Rentals',    2),
  ('apparel',             'Apparel',             3),
  ('classifieds',         'Classifieds',         4),
  ('electronics',         'Electronics',         5),
  ('entertainment',       'Entertainment',       6),
  ('family',              'Family',              7),
  ('free-stuff',          'Free Stuff',          8),
  ('garden-outdoor',      'Garden & Outdoor',    9),
  ('hobbies',             'Hobbies',            10),
  ('home-goods',          'Home Goods',         11),
  ('home-improvement',    'Home Improvement',   12),
  ('home-sales',          'Home Sales',         13),
  ('musical-instruments', 'Musical Instruments',14),
  ('office-supplies',     'Office Supplies',    15),
  ('pet-supplies',        'Pet Supplies',       16),
  ('sporting-goods',      'Sporting Goods',     17),
  ('toys-games',          'Toys & Games',       18),
  ('buy-and-sell-groups', 'Buy and sell groups',19);

-- ---------- Listings --------------------------------------------------------

create table public.listings (
  id           uuid primary key default gen_random_uuid(),
  title        varchar(255) not null,
  description  text,
  price        numeric(10,2) not null check (price >= 0),
  category_id  uuid not null references public.categories(id) on delete restrict,
  seller_email varchar(255) not null,
  image_url    text not null,
  location     varchar(255) not null default 'Palo Alto, CA',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index listings_category_id_idx on public.listings (category_id);
create index listings_created_at_idx  on public.listings (created_at desc);

-- ---------- Messages --------------------------------------------------------

create table public.messages (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings(id) on delete cascade,
  buyer_email  varchar(255) not null,
  seller_email varchar(255) not null,
  message      text not null check (char_length(message) > 0),
  created_at   timestamptz not null default now()
);

create index messages_listing_id_idx on public.messages (listing_id, created_at desc);

-- ---------- Stripe connect accounts -----------------------------------------
-- Test 4. A seller is identified by the email on their listings, so one row
-- here maps that email to a Stripe Connect account. Onboarding state is an
-- append-only event log rather than an editable column: it keeps the whole
-- schema INSERT-only, so no UPDATE policy is needed and the webhook cannot
-- rewrite an account id.

create table if not exists public.stripe_accounts (
  id                uuid primary key default gen_random_uuid(),
  seller_email      varchar(255) not null unique,
  stripe_account_id varchar(255) not null unique,
  created_at        timestamptz not null default now()
);

create index if not exists stripe_accounts_stripe_account_id_idx
  on public.stripe_accounts (stripe_account_id);

create table if not exists public.stripe_account_events (
  id                uuid primary key default gen_random_uuid(),
  stripe_account_id varchar(255) not null,
  charges_enabled   boolean not null default false,
  details_submitted boolean not null default false,
  payouts_enabled   boolean not null default false,
  created_at        timestamptz not null default now()
);

create index if not exists stripe_account_events_lookup_idx
  on public.stripe_account_events (stripe_account_id, created_at desc);

-- ---------- Orders -----------------------------------------------------------
-- Test 4. A row here IS a completed payment: the webhook inserts one only when
-- Stripe reports `payment_status = paid`. "Sold" is derived from the existence
-- of a row, so `listings` never needs an UPDATE policy.

create table if not exists public.orders (
  id                         uuid primary key default gen_random_uuid(),
  listing_id                 uuid not null references public.listings(id) on delete cascade,
  buyer_email                varchar(255) not null,
  stripe_checkout_session_id varchar(255) not null unique,
  stripe_account_id          varchar(255) not null,
  amount_cents               integer not null check (amount_cents >= 0),
  fee_cents                  integer not null check (fee_cents >= 0),
  currency                   char(3) not null default 'usd',
  status                     varchar(32) not null default 'paid',
  created_at                 timestamptz not null default now()
);

create index if not exists orders_listing_id_idx on public.orders (listing_id);
create index if not exists orders_buyer_email_idx on public.orders (buyer_email);

-- One paid order per listing, so a retried webhook (or a second buyer racing
-- the first) cannot create a second "sold" state.
create unique index if not exists orders_one_paid_per_listing_idx
  on public.orders (listing_id) where status = 'paid';

-- ---------- updated_at trigger ---------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

-- ---------- Row Level Security ---------------------------------------------

alter table public.categories           enable row level security;
alter table public.listings             enable row level security;
alter table public.messages             enable row level security;
alter table public.stripe_accounts      enable row level security;
alter table public.stripe_account_events enable row level security;
alter table public.orders                enable row level security;

create policy "categories are readable by everyone"
  on public.categories for select to anon using (true);

create policy "listings are readable by everyone"
  on public.listings for select to anon using (true);

create policy "anyone can create listings"
  on public.listings for insert to anon with check (true);

create policy "messages are readable by everyone"
  on public.messages for select to anon using (true);

create policy "anyone can send messages"
  on public.messages for insert to anon with check (true);

create policy "stripe accounts are readable by everyone"
  on public.stripe_accounts for select to anon using (true);

create policy "the server can create connect accounts"
  on public.stripe_accounts for insert to anon with check (true);

create policy "stripe account events are readable by everyone"
  on public.stripe_account_events for select to anon using (true);

-- The webhook appends onboarding state; it never rewrites an account, so this
-- stays an insert-only table like every other one here.
create policy "the webhook can append account events"
  on public.stripe_account_events for insert to anon with check (true);

create policy "orders are readable by everyone"
  on public.orders for select to anon using (true);

-- The webhook is the only writer, and only for a session it created.
create policy "the webhook can record orders"
  on public.orders for insert to anon with check (true);

-- ---------- Data API exposure ----------------------------------------------
-- Since 2026-04-28 new public-schema tables are not auto-exposed to the Data
-- API. Grant the anon role access explicitly (RLS still applies row-level).

grant usage on schema public to anon;
grant select on public.categories to anon;
grant select, insert on public.listings to anon;
grant select, insert on public.messages to anon;
grant select, insert on public.stripe_accounts to anon;
grant select, insert on public.stripe_account_events to anon;
grant select, insert on public.orders to anon;

-- ---------- Storage ---------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

create policy "listing images are publicly readable"
  on storage.objects for select to anon
  using (bucket_id = 'listing-images');

create policy "anyone can upload listing images"
  on storage.objects for insert to anon
  with check (bucket_id = 'listing-images');
```

The same SQL lives in `supabase/schema.sql` (canonical file for the Supabase
CLI); keep the two in sync.

## Notes / follow-ups

- `location` is a constant default, not a form field — the mockup form has no
  location input.
- No `seller_name` column: the brief only requires `seller_email`. The name
  shown in the mockup detail view is placeholder copy.
- `image_url` is `not null` because the brief requires a photo. The upload must
  succeed before the listing is created.
- For local development, run the same SQL against the Supabase CLI's local
  stack (`supabase db reset`) or paste it into the hosted SQL editor.
- `orders` is append-only like every other table: a payment is recorded once,
  never edited. Refunding is out of scope (sandbox only), so no refund path
  exists.
- `orders.status` is `paid` on every row the app writes; it is a column rather
  than an implicit "row exists = sold" so the Sold query reads as intent and so
  a non-paid state could be recorded later without a migration.
- `stripe_accounts` / `stripe_account_events` exist so the app can record a
  Connect account. They are public *read* by default like every other table, so
  `/connect` and `/api/connect/status` work without auth; nothing here is secret
  (a Stripe account id is not a credential). The webhook only appends rows for
  account ids the app already created, which is what keeps the shared sandbox
  from writing other candidates' sellers into this table.
