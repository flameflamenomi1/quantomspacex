-- =============================================================================
-- Quantumspacex / Motionssalt — Initial Schema Migration
-- =============================================================================
-- Reverse-engineered from the client-side code (src/lib/db.ts, pages, components).
-- Idempotent: safe to re-run. Enables Row Level Security on every table.
--
-- HOW TO APPLY:
--   1. Open Supabase Dashboard → SQL Editor → New Query
--   2. Paste the entire contents of this file
--   3. Click "Run"
--
-- IMPORTANT NOTES / ASSUMPTIONS:
--   * This app implements its OWN password auth (base64 hash column on public.users).
--     It does NOT use Supabase Auth (`auth.users`). The `users.id` is a plain
--     uuid PK, not a foreign key to `auth.users`.
--   * Because the frontend uses the `anon` role directly (no JWT-based auth),
--     RLS policies are intentionally permissive for the `anon` role on the
--     tables the app reads/writes. If you later migrate to Supabase Auth,
--     tighten these policies (see comments at the bottom).
--   * Two storage buckets are needed — created via inserts into
--     storage.buckets. They are made public so getPublicUrl() works.
-- =============================================================================

-- Extensions ------------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";


-- =============================================================================
-- users
-- =============================================================================
create table if not exists public.users (
  id                uuid primary key default gen_random_uuid(),
  full_name         text not null,
  email             text not null unique,
  phone             text,
  country           text,
  password_hash     text not null,
  balance           numeric(20,2) not null default 0,
  status            text not null default 'active'
                    check (status in ('active','suspended','pending')),
  kyc_status        text not null default 'unverified'
                    check (kyc_status in ('unverified','pending','approved','rejected')),
  profile_photo     text,
  referral_code     text unique,
  referred_by       text,
  role              text not null default 'user'
                    check (role in ('user','admin')),
  admin_note        text,
  created_at        timestamptz not null default now()
);

create index if not exists users_email_idx        on public.users (email);
create index if not exists users_role_idx         on public.users (role);
create index if not exists users_status_idx       on public.users (status);
create index if not exists users_created_at_idx   on public.users (created_at desc);


-- =============================================================================
-- deposits
-- =============================================================================
create table if not exists public.deposits (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  amount            numeric(20,2) not null,
  crypto_currency   text not null,
  tx_hash           text,
  wallet_address    text,
  receipt_url       text,
  status            text not null default 'pending'
                    check (status in ('pending','approved','rejected')),
  admin_note        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists deposits_user_id_idx     on public.deposits (user_id);
create index if not exists deposits_status_idx      on public.deposits (status);
create index if not exists deposits_created_at_idx  on public.deposits (created_at desc);


-- =============================================================================
-- withdrawals
-- =============================================================================
create table if not exists public.withdrawals (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  amount            numeric(20,2) not null,
  crypto_currency   text not null,
  wallet_address    text not null,
  network           text,
  status            text not null default 'pending'
                    check (status in ('pending','approved','rejected')),
  admin_note        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists withdrawals_user_id_idx     on public.withdrawals (user_id);
create index if not exists withdrawals_status_idx      on public.withdrawals (status);
create index if not exists withdrawals_created_at_idx  on public.withdrawals (created_at desc);


-- =============================================================================
-- kyc_submissions
-- =============================================================================
create table if not exists public.kyc_submissions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  full_name         text not null,
  date_of_birth     date,
  nationality       text,
  id_type           text check (id_type in ('passport','national_id','drivers_license')),
  id_number         text,
  id_front_url      text,
  id_back_url       text,
  selfie_url        text,
  status            text not null default 'pending'
                    check (status in ('pending','approved','rejected')),
  admin_note        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists kyc_user_id_idx     on public.kyc_submissions (user_id);
create index if not exists kyc_status_idx      on public.kyc_submissions (status);
create index if not exists kyc_created_at_idx  on public.kyc_submissions (created_at desc);


-- =============================================================================
-- trades
-- =============================================================================
create table if not exists public.trades (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  asset_symbol      text not null,
  asset_name        text not null,
  asset_type        text not null check (asset_type in ('stock','crypto','commodity')),
  trade_type        text not null check (trade_type in ('buy','sell')),
  quantity          numeric(30,10) not null,
  price             numeric(20,4) not null,
  total_value       numeric(20,2) not null default 0,
  profit_loss       numeric(20,2) not null default 0,
  status            text not null default 'open'
                    check (status in ('open','closed','cancelled')),
  sent_by_admin     boolean not null default false,
  executed_at       timestamptz not null default now(),
  balance_before    numeric(20,2),
  balance_after     numeric(20,2),
  history_note      text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  closed_at         timestamptz
);

create index if not exists trades_user_id_idx     on public.trades (user_id);
create index if not exists trades_status_idx      on public.trades (status);
create index if not exists trades_created_at_idx  on public.trades (created_at desc);


-- =============================================================================
-- balance_history
-- =============================================================================
create table if not exists public.balance_history (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  balance           numeric(20,2) not null,
  change_amount     numeric(20,2) not null default 0,
  change_type       text not null,   -- 'deposit' | 'withdrawal' | 'trade' | 'adjustment' | 'investment' | 'payout'
  description       text,
  created_at        timestamptz not null default now()
);

create index if not exists balance_history_user_id_idx     on public.balance_history (user_id);
create index if not exists balance_history_created_at_idx  on public.balance_history (created_at desc);


-- =============================================================================
-- chat_messages
-- =============================================================================
create table if not exists public.chat_messages (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  sender            text not null check (sender in ('user','admin')),
  message           text not null,
  is_read           boolean not null default false,
  created_at        timestamptz not null default now()
);

create index if not exists chat_messages_user_id_idx     on public.chat_messages (user_id);
create index if not exists chat_messages_created_at_idx  on public.chat_messages (created_at);


-- =============================================================================
-- notifications  (per-user notifications)
-- =============================================================================
create table if not exists public.notifications (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  title             text not null,
  message           text not null,
  type              text not null default 'info'
                    check (type in ('info','success','warning','error')),
  is_read           boolean not null default false,
  created_at        timestamptz not null default now()
);

create index if not exists notifications_user_id_idx     on public.notifications (user_id);
create index if not exists notifications_created_at_idx  on public.notifications (created_at desc);


-- =============================================================================
-- admin_notifications  (system-wide admin alerts)
-- =============================================================================
create table if not exists public.admin_notifications (
  id                        uuid primary key default gen_random_uuid(),
  title                     text not null,
  message                   text not null,
  type                      text not null default 'info',   -- e.g. 'alert','info'
  related_user_id           uuid references public.users(id) on delete set null,
  related_subscription_id   uuid,
  is_read                   boolean not null default false,
  created_at                timestamptz not null default now()
);

create index if not exists admin_notifications_created_at_idx  on public.admin_notifications (created_at desc);
create index if not exists admin_notifications_sub_idx         on public.admin_notifications (related_subscription_id);


-- =============================================================================
-- verification_codes
-- =============================================================================
create table if not exists public.verification_codes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  email             text not null,
  code              text not null,
  type              text not null check (type in ('login','withdrawal','register','password_reset')),
  used              boolean not null default false,
  expires_at        timestamptz not null,
  created_at        timestamptz not null default now()
);

create index if not exists verification_codes_user_id_idx     on public.verification_codes (user_id);
create index if not exists verification_codes_code_idx        on public.verification_codes (code);
create index if not exists verification_codes_created_at_idx  on public.verification_codes (created_at desc);


-- =============================================================================
-- investment_plans  (catalog of plan tiers)
-- =============================================================================
create table if not exists public.investment_plans (
  id                        uuid primary key default gen_random_uuid(),
  name                      text not null,
  slug                      text unique,
  description               text,
  min_amount                numeric(20,2) not null,
  max_amount                numeric(20,2) not null,
  duration_days             integer not null,
  expected_return_percent   numeric(6,2) not null,
  is_active                 boolean not null default true,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists investment_plans_active_idx     on public.investment_plans (is_active);
create index if not exists investment_plans_min_amount_idx on public.investment_plans (min_amount);


-- =============================================================================
-- plan_subscriptions  (a user's active/completed enrolments)
-- =============================================================================
create table if not exists public.plan_subscriptions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  plan_id           uuid not null references public.investment_plans(id) on delete restrict,
  amount            numeric(20,2) not null,
  status            text not null default 'active'
                    check (status in ('active','completed','cancelled')),
  start_date        timestamptz not null default now(),
  end_date          timestamptz not null,
  expected_payout   numeric(20,2) not null,
  actual_payout     numeric(20,2),
  admin_note        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists plan_subs_user_id_idx     on public.plan_subscriptions (user_id);
create index if not exists plan_subs_plan_id_idx     on public.plan_subscriptions (plan_id);
create index if not exists plan_subs_status_idx      on public.plan_subscriptions (status);
create index if not exists plan_subs_created_at_idx  on public.plan_subscriptions (created_at desc);


-- =============================================================================
-- admin_activity_log
-- =============================================================================
create table if not exists public.admin_activity_log (
  id                uuid primary key default gen_random_uuid(),
  admin_id          uuid,
  admin_name        text,
  action            text not null,
  target_user_id    uuid,
  target_user_name  text,
  details           text,
  created_at        timestamptz not null default now()
);

create index if not exists admin_activity_log_created_at_idx on public.admin_activity_log (created_at desc);


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
-- The app uses the anon key directly (no JWT). We enable RLS on every table
-- and add permissive anon policies so the current code keeps working.
-- Replace these with stricter (auth.uid() = user_id) policies if/when you
-- migrate to Supabase Auth.
-- =============================================================================

alter table public.users                enable row level security;
alter table public.deposits             enable row level security;
alter table public.withdrawals          enable row level security;
alter table public.kyc_submissions      enable row level security;
alter table public.trades               enable row level security;
alter table public.balance_history      enable row level security;
alter table public.chat_messages        enable row level security;
alter table public.notifications        enable row level security;
alter table public.admin_notifications  enable row level security;
alter table public.verification_codes   enable row level security;
alter table public.investment_plans     enable row level security;
alter table public.plan_subscriptions   enable row level security;
alter table public.admin_activity_log   enable row level security;


do $$
declare
  t text;
  tables text[] := array[
    'users','deposits','withdrawals','kyc_submissions','trades',
    'balance_history','chat_messages','notifications','admin_notifications',
    'verification_codes','investment_plans','plan_subscriptions','admin_activity_log'
  ];
begin
  foreach t in array tables loop
    -- SELECT
    execute format($f$
      drop policy if exists "%1$s anon select" on public.%1$I;
      create policy "%1$s anon select" on public.%1$I
        for select to anon, authenticated using (true);
    $f$, t);

    -- INSERT
    execute format($f$
      drop policy if exists "%1$s anon insert" on public.%1$I;
      create policy "%1$s anon insert" on public.%1$I
        for insert to anon, authenticated with check (true);
    $f$, t);

    -- UPDATE
    execute format($f$
      drop policy if exists "%1$s anon update" on public.%1$I;
      create policy "%1$s anon update" on public.%1$I
        for update to anon, authenticated using (true) with check (true);
    $f$, t);

    -- DELETE
    execute format($f$
      drop policy if exists "%1$s anon delete" on public.%1$I;
      create policy "%1$s anon delete" on public.%1$I
        for delete to anon, authenticated using (true);
    $f$, t);
  end loop;
end $$;


-- =============================================================================
-- REALTIME
-- =============================================================================
-- The app subscribes to postgres_changes on trades / deposits / withdrawals /
-- notifications / users. Add them to the supabase_realtime publication.
-- =============================================================================
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

do $$
declare
  t text;
  rt_tables text[] := array[
    'users','deposits','withdrawals','trades','notifications',
    'admin_notifications','chat_messages','plan_subscriptions','balance_history'
  ];
begin
  foreach t in array rt_tables loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      -- already in the publication, ignore
      null;
    end;
  end loop;
end $$;


-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================
-- The code uploads to: kyc-documents, receipts, deposit-receipts.
-- We make them public so getPublicUrl() works out of the box. For KYC docs
-- in production you'll likely want to make kyc-documents private and use
-- signed URLs instead — set `public = false` here and adjust the code.
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('kyc-documents',    'kyc-documents',    true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('receipts',         'receipts',         true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('deposit-receipts', 'deposit-receipts', true)
on conflict (id) do nothing;

-- Storage RLS: allow anon to read and upload to these three buckets.
drop policy if exists "app buckets anon read"   on storage.objects;
create policy "app buckets anon read" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('kyc-documents','receipts','deposit-receipts'));

drop policy if exists "app buckets anon insert" on storage.objects;
create policy "app buckets anon insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id in ('kyc-documents','receipts','deposit-receipts'));

drop policy if exists "app buckets anon update" on storage.objects;
create policy "app buckets anon update" on storage.objects
  for update to anon, authenticated
  using (bucket_id in ('kyc-documents','receipts','deposit-receipts'))
  with check (bucket_id in ('kyc-documents','receipts','deposit-receipts'));

drop policy if exists "app buckets anon delete" on storage.objects;
create policy "app buckets anon delete" on storage.objects
  for delete to anon, authenticated
  using (bucket_id in ('kyc-documents','receipts','deposit-receipts'));


-- =============================================================================
-- SEED DATA — Investment Plan Tiers
-- =============================================================================
-- The app displays 3 plan tiers on /investment-plans (Starter / Popular / Elite),
-- iterating rows ordered by min_amount. These seeds give a working default set.
-- Adjust freely in the SQL editor later without redeploying the app.
-- =============================================================================
insert into public.investment_plans
  (name, slug, description, min_amount, max_amount, duration_days, expected_return_percent, is_active)
values
  ('Starter Plan',  'starter',
   'Entry-tier managed portfolio. Perfect for first-time investors testing the platform.',
   500,     9999,     30, 8.00,  true),
  ('Growth Plan',   'growth',
   'Balanced managed portfolio actively traded by our desk. Our most popular tier.',
   10000,   99999,    60, 18.00, true),
  ('Elite Plan',    'elite',
   'High-allocation managed portfolio with priority desk coverage and premium execution.',
   100000,  5000000, 120, 32.00, true)
on conflict (slug) do nothing;


-- =============================================================================
-- SEED DATA — Default admin user
-- =============================================================================
-- The Admin login screen advertises admin@quantumspacex.com / Admin123!
-- password_hash uses the app's btoa() convention (base-64 of the plaintext).
-- btoa('Admin123!') = 'QWRtaW4xMjMh'
-- CHANGE THIS PASSWORD after the first login.
-- =============================================================================
insert into public.users (full_name, email, password_hash, role, status, kyc_status)
values ('Platform Admin', 'admin@quantumspacex.com', 'QWRtaW4xMjMh', 'admin', 'active', 'approved')
on conflict (email) do nothing;


-- =============================================================================
-- DONE
-- =============================================================================
