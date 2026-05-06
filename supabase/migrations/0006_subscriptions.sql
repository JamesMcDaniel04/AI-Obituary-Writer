alter table public.director_profiles
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text unique,
  add column if not exists subscription_status text,
  add column if not exists current_period_end timestamptz,
  add column if not exists trial_end timestamptz;

create index if not exists director_profiles_stripe_customer_id_idx
  on public.director_profiles (stripe_customer_id);

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default timezone('utc', now()),
  payload jsonb not null
);

alter table public.stripe_events enable row level security;

revoke all on public.stripe_events from anon, authenticated;

create or replace function public.has_active_subscription(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.director_profiles
    where director_id = uid
      and (
        role = 'admin'::public.app_role
        or subscription_status in ('trialing', 'active')
      )
  );
$$;

revoke all on function public.has_active_subscription(uuid) from public;
grant execute on function public.has_active_subscription(uuid) to authenticated;
