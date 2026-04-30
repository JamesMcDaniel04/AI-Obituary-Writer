-- Per-director delivery email template + a public delivery token on cases.

alter table public.cases
  add column if not exists delivery_token text unique
    check (delivery_token is null or char_length(delivery_token) = 32);

create table if not exists public.delivery_templates (
  director_id uuid primary key references auth.users(id) on delete cascade,
  subject text not null,
  body text not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_delivery_templates_updated_at
before update on public.delivery_templates
for each row
execute function public.set_updated_at();

alter table public.delivery_templates enable row level security;

create policy "workspace_users_select_delivery_templates"
on public.delivery_templates
for select
using (director_id = auth.uid() or public.is_admin());

create policy "workspace_users_insert_delivery_templates"
on public.delivery_templates
for insert
with check (director_id = auth.uid() or public.is_admin());

create policy "workspace_users_update_delivery_templates"
on public.delivery_templates
for update
using (director_id = auth.uid() or public.is_admin())
with check (director_id = auth.uid() or public.is_admin());

create policy "workspace_users_delete_delivery_templates"
on public.delivery_templates
for delete
using (director_id = auth.uid() or public.is_admin());

-- Track when a delivery email was sent and to whom (audit/debug).
create table if not exists public.delivery_log (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  sent_by uuid not null references auth.users(id) on delete cascade,
  recipient text not null,
  subject text not null,
  share_url text not null,
  provider_message_id text,
  sent_at timestamptz not null default timezone('utc', now())
);

create index if not exists delivery_log_case_id_sent_at_idx
  on public.delivery_log (case_id, sent_at desc);

alter table public.delivery_log enable row level security;

create policy "workspace_users_select_delivery_log"
on public.delivery_log
for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.cases
    where public.cases.id = public.delivery_log.case_id
      and public.cases.director_id = auth.uid()
  )
);

create policy "workspace_users_insert_delivery_log"
on public.delivery_log
for insert
with check (
  sent_by = auth.uid()
  and (
    public.is_admin()
    or exists (
      select 1
      from public.cases
      where public.cases.id = public.delivery_log.case_id
        and public.cases.director_id = auth.uid()
    )
  )
);
