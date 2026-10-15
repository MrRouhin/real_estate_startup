-- =====================================================================
-- 0001  CORE SCHEMA  — real estate platform (MVP + room for ops modules)
-- Multi-tenant: every business row carries org_id (the developer/seller).
-- =====================================================================

-- ---------- Enums ----------------------------------------------------
create type public.app_role as enum
  ('buyer', 'seller', 'admin', 'contractor', 'vendor', 'employee');

create type public.org_role as enum ('owner', 'manager', 'staff');

create type public.plot_status as enum
  ('available', 'held', 'booked', 'sold', 'blocked');

create type public.facing as enum
  ('north', 'south', 'east', 'west',
   'north_east', 'north_west', 'south_east', 'south_west');

create type public.project_status as enum ('upcoming', 'ongoing', 'completed');

create type public.booking_status as enum
  ('pending_payment', 'confirmed', 'registered', 'handed_over',
   'cancelled', 'refund_due');

create type public.payment_status as enum ('created', 'paid', 'failed', 'refunded');

create type public.installment_status as enum ('due', 'paid', 'overdue');

create type public.doc_visibility as enum ('public', 'buyer', 'internal');

-- ---------- Organizations (developers / sellers) ---------------------
create table public.organizations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  gst_number    text,
  phone         text,
  email         text,
  is_verified   boolean not null default false,   -- admin approves
  token_percent numeric(5,2) not null default 10   -- booking token as % of price
                check (token_percent > 0 and token_percent <= 10),
  created_at    timestamptz not null default now()
);

-- ---------- Profiles (1:1 with auth.users) ---------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  phone       text,
  email       text,
  role        public.app_role not null default 'buyer',
  kyc_status  text not null default 'not_started'
              check (kyc_status in ('not_started', 'submitted', 'verified', 'rejected')),
  created_at  timestamptz not null default now()
);

-- Seller staff belong to an organization
create table public.organization_members (
  org_id     uuid not null references public.organizations (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  org_role   public.org_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- ---------- Projects -------------------------------------------------
create table public.projects (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations (id) on delete cascade,
  name             text not null,
  slug             text not null unique,
  city             text,
  address          text,
  description      text,
  rera_number      text,                  -- shown on every listing
  status           public.project_status not null default 'upcoming',
  progress_percent numeric(5,2) not null default 0
                   check (progress_percent between 0 and 100),
  layout_svg_path  text,                  -- path in Storage bucket 'layouts'
  layout_viewbox   text,                  -- e.g. '0 0 1200 800', copied from the SVG
  cover_image_path text,
  is_published     boolean not null default false,
  created_at       timestamptz not null default now(),
  unique (id, org_id)                     -- lets children enforce same org
);

-- ---------- Plots ----------------------------------------------------
create table public.plots (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null,
  project_id   uuid not null,
  plot_number  text not null,             -- e.g. 'A05'
  area_sqft    numeric(10,2) not null check (area_sqft > 0),
  dimensions   text,                      -- e.g. '30x40'
  facing       public.facing,
  is_corner    boolean not null default false,
  price        numeric(14,2) not null check (price > 0),
  status       public.plot_status not null default 'available',
  svg_shape_id text,                      -- id of this plot's polygon in the layout SVG
  shape_path   text,                      -- SVG path 'd' for this plot, extracted at upload
  held_by      uuid references public.profiles (id),
  held_until   timestamptz,
  created_at   timestamptz not null default now(),
  foreign key (project_id, org_id) references public.projects (id, org_id) on delete cascade,
  unique (project_id, plot_number),
  unique (id, org_id),
  check ((status = 'held') = (held_by is not null and held_until is not null))
);
create index plots_project_status_idx on public.plots (project_id, status);

create table public.plot_price_history (
  id         bigint generated always as identity primary key,
  plot_id    uuid not null references public.plots (id) on delete cascade,
  org_id     uuid not null references public.organizations (id) on delete cascade,
  price      numeric(14,2) not null,
  changed_at timestamptz not null default now()
);
create index plot_price_history_plot_idx on public.plot_price_history (plot_id, changed_at);

-- ---------- Bookings & payments -------------------------------------
create table public.bookings (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null,
  plot_id       uuid not null,
  buyer_id      uuid not null references public.profiles (id),
  status        public.booking_status not null default 'pending_payment',
  total_amount  numeric(14,2) not null check (total_amount > 0),
  token_amount  numeric(14,2) not null check (token_amount > 0),
  notes         text,
  created_at    timestamptz not null default now(),
  confirmed_at  timestamptz,
  foreign key (plot_id, org_id) references public.plots (id, org_id),
  check (token_amount <= total_amount)
);
-- At most one live booking per plot, enforced by the database itself
create unique index bookings_one_live_per_plot on public.bookings (plot_id)
  where status in ('pending_payment', 'confirmed', 'registered', 'handed_over');
create index bookings_buyer_idx on public.bookings (buyer_id);
create index bookings_org_idx on public.bookings (org_id, status);

-- Installment plan for a booking (token, agreement, milestones...)
create table public.payment_schedule (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings (id) on delete cascade,
  org_id      uuid not null references public.organizations (id) on delete cascade,
  label       text not null,              -- 'Token', 'Agreement', 'Foundation'...
  amount      numeric(14,2) not null check (amount > 0),
  due_date    date,
  status      public.installment_status not null default 'due',
  sort_order  int not null default 0
);
create index payment_schedule_booking_idx on public.payment_schedule (booking_id);

create table public.payments (
  id                   uuid primary key default gen_random_uuid(),
  booking_id           uuid not null references public.bookings (id) on delete cascade,
  installment_id       uuid references public.payment_schedule (id),
  org_id               uuid not null references public.organizations (id) on delete cascade,
  buyer_id             uuid not null references public.profiles (id),
  amount               numeric(14,2) not null check (amount > 0),
  currency             text not null default 'INR',
  razorpay_order_id    text unique,
  razorpay_payment_id  text unique,
  status               public.payment_status not null default 'created',
  paid_at              timestamptz,
  created_at           timestamptz not null default now()
);
create index payments_booking_idx on public.payments (booking_id);

-- ---------- Content: documents, updates, announcements ---------------
create table public.documents (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  project_id   uuid not null references public.projects (id) on delete cascade,
  booking_id   uuid references public.bookings (id) on delete cascade, -- set for a buyer's own docs
  title        text not null,
  category     text not null default 'general', -- 'rera', 'approval', 'brochure', 'agreement', 'receipt'
  storage_path text not null,                   -- path in Storage bucket 'documents'
  visibility   public.doc_visibility not null default 'public',
  uploaded_by  uuid references public.profiles (id),
  created_at   timestamptz not null default now(),
  check (visibility <> 'buyer' or booking_id is not null)
);
create index documents_project_idx on public.documents (project_id);

create table public.construction_updates (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations (id) on delete cascade,
  project_id       uuid not null references public.projects (id) on delete cascade,
  title            text not null,
  body             text,
  progress_percent numeric(5,2) check (progress_percent between 0 and 100),
  photo_paths      text[] not null default '{}',
  created_by       uuid references public.profiles (id),
  created_at       timestamptz not null default now()
);
create index construction_updates_project_idx on public.construction_updates (project_id, created_at desc);

create table public.announcements (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  project_id  uuid not null references public.projects (id) on delete cascade,
  title       text not null,
  body        text,
  created_at  timestamptz not null default now()
);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      text not null,
  body       text,
  link       text,                         -- deep link inside the app
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------- Triggers -------------------------------------------------
-- Create a profile automatically when someone signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone, email)
  values (new.id, new.phone, new.email);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep a price history row every time a plot's price is set or changed
create or replace function public.log_plot_price()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.price is distinct from old.price then
    insert into public.plot_price_history (plot_id, org_id, price)
    values (new.id, new.org_id, new.price);
  end if;
  return new;
end $$;

create trigger plots_price_history
  after insert or update of price on public.plots
  for each row execute function public.log_plot_price();
