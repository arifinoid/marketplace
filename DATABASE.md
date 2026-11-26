# DATABASE.md — Supabase Schema

Source of truth for the database. Apply the SQL in the Supabase SQL editor
(Projects → SQL Editor → New query → paste → Run). Requires Postgres 15+ and
the `pgcrypto` extension for `gen_random_uuid()`.

The schema is intentionally small: a fixed category list, listings, messages,
and one public storage bucket. There is **no auth** in this iteration, so the
only role that needs access is `anon` (the role mapped to the publishable key).

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
- `storage.objects`: SELECT, INSERT (bucket `listing-images`)

No UPDATE/DELETE policies exist. If auth is added later, replace the blanket
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

alter table public.categories enable row level security;
alter table public.listings   enable row level security;
alter table public.messages   enable row level security;

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

-- ---------- Data API exposure ----------------------------------------------
-- Since 2026-04-28 new public-schema tables are not auto-exposed to the Data
-- API. Grant the anon role access explicitly (RLS still applies row-level).

grant usage on schema public to anon;
grant select on public.categories to anon;
grant select, insert on public.listings to anon;
grant select, insert on public.messages to anon;

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
