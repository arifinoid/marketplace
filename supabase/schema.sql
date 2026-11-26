-- ============================================================================
-- Marketplace schema — Supabase / Postgres 15+
-- ============================================================================
-- Canonical SQL for the database. Apply in the Supabase SQL editor, or with the
-- Supabase CLI (`supabase db reset` / `supabase db push`) once the project is
-- linked. See DATABASE.md for the table/column reference.

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
