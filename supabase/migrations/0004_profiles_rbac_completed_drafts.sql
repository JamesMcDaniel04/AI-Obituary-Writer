do $$
begin
  create type public.app_role as enum ('director', 'admin');
exception
  when duplicate_object then null;
end
$$;

alter table public.director_profiles
  add column if not exists full_name text,
  add column if not exists email text,
  add column if not exists role public.app_role not null default 'director';

update public.director_profiles
set
  email = coalesce(public.director_profiles.email, auth.users.email),
  full_name = coalesce(
    public.director_profiles.full_name,
    nullif(auth.users.raw_user_meta_data ->> 'full_name', ''),
    nullif(auth.users.raw_user_meta_data ->> 'name', '')
  )
from auth.users
where auth.users.id = public.director_profiles.director_id;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select role = 'admin'::public.app_role
      from public.director_profiles
      where director_id = auth.uid()
    ),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "directors_select_own_cases" on public.cases;
drop policy if exists "directors_insert_own_cases" on public.cases;
drop policy if exists "directors_update_own_cases" on public.cases;
drop policy if exists "directors_delete_own_cases" on public.cases;

create policy "workspace_users_select_cases"
on public.cases
for select
using (director_id = auth.uid() or public.is_admin());

create policy "workspace_users_insert_cases"
on public.cases
for insert
with check (director_id = auth.uid() or public.is_admin());

create policy "workspace_users_update_cases"
on public.cases
for update
using (director_id = auth.uid() or public.is_admin())
with check (director_id = auth.uid() or public.is_admin());

create policy "workspace_users_delete_cases"
on public.cases
for delete
using (director_id = auth.uid() or public.is_admin());

drop policy if exists "directors_select_own_drafts" on public.obituary_drafts;
drop policy if exists "directors_insert_own_drafts" on public.obituary_drafts;
drop policy if exists "directors_update_own_drafts" on public.obituary_drafts;

create policy "workspace_users_select_drafts"
on public.obituary_drafts
for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.cases
    where public.cases.id = public.obituary_drafts.case_id
      and public.cases.director_id = auth.uid()
  )
);

create policy "workspace_users_insert_drafts"
on public.obituary_drafts
for insert
with check (
  public.is_admin()
  or exists (
    select 1
    from public.cases
    where public.cases.id = public.obituary_drafts.case_id
      and public.cases.director_id = auth.uid()
  )
);

create policy "workspace_users_update_drafts"
on public.obituary_drafts
for update
using (
  public.is_admin()
  or exists (
    select 1
    from public.cases
    where public.cases.id = public.obituary_drafts.case_id
      and public.cases.director_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.cases
    where public.cases.id = public.obituary_drafts.case_id
      and public.cases.director_id = auth.uid()
  )
);

drop policy if exists "directors_select_own_edits" on public.obituary_edits;
drop policy if exists "directors_insert_own_edits" on public.obituary_edits;

create policy "workspace_users_select_edits"
on public.obituary_edits
for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.cases
    where public.cases.id = public.obituary_edits.case_id
      and public.cases.director_id = auth.uid()
  )
);

create policy "workspace_users_insert_edits"
on public.obituary_edits
for insert
with check (
  director_id = auth.uid()
  and (
    public.is_admin()
    or exists (
      select 1
      from public.cases
      where public.cases.id = public.obituary_edits.case_id
        and public.cases.director_id = auth.uid()
    )
  )
);

drop policy if exists "directors_select_own_profile" on public.director_profiles;
drop policy if exists "directors_insert_own_profile" on public.director_profiles;
drop policy if exists "directors_update_own_profile" on public.director_profiles;
drop policy if exists "directors_delete_own_profile" on public.director_profiles;

create policy "workspace_users_select_profiles"
on public.director_profiles
for select
using (director_id = auth.uid() or public.is_admin());

create policy "workspace_users_insert_profiles"
on public.director_profiles
for insert
with check (director_id = auth.uid() or public.is_admin());

create policy "workspace_users_update_profiles"
on public.director_profiles
for update
using (director_id = auth.uid() or public.is_admin())
with check (director_id = auth.uid() or public.is_admin());

create policy "workspace_users_delete_profiles"
on public.director_profiles
for delete
using (director_id = auth.uid() or public.is_admin());

create table if not exists public.completed_drafts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.cases(id) on delete cascade,
  completed_by uuid not null references auth.users(id) on delete cascade,
  content text not null,
  ai_provider text not null,
  model text not null,
  completed_at timestamptz not null default timezone('utc', now())
);

create index if not exists completed_drafts_completed_by_completed_at_idx
  on public.completed_drafts (completed_by, completed_at desc);

alter table public.completed_drafts enable row level security;

create policy "workspace_users_select_completed_drafts"
on public.completed_drafts
for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.cases
    where public.cases.id = public.completed_drafts.case_id
      and public.cases.director_id = auth.uid()
  )
);

create policy "workspace_users_insert_completed_drafts"
on public.completed_drafts
for insert
with check (
  completed_by = auth.uid()
  and (
    public.is_admin()
    or exists (
      select 1
      from public.cases
      where public.cases.id = public.completed_drafts.case_id
        and public.cases.director_id = auth.uid()
    )
  )
);

create policy "workspace_users_update_completed_drafts"
on public.completed_drafts
for update
using (
  public.is_admin()
  or exists (
    select 1
    from public.cases
    where public.cases.id = public.completed_drafts.case_id
      and public.cases.director_id = auth.uid()
  )
)
with check (
  completed_by = auth.uid()
  and (
    public.is_admin()
    or exists (
      select 1
      from public.cases
      where public.cases.id = public.completed_drafts.case_id
        and public.cases.director_id = auth.uid()
    )
  )
);

create policy "workspace_users_delete_completed_drafts"
on public.completed_drafts
for delete
using (
  public.is_admin()
  or exists (
    select 1
    from public.cases
    where public.cases.id = public.completed_drafts.case_id
      and public.cases.director_id = auth.uid()
  )
);

insert into public.completed_drafts (
  case_id,
  completed_by,
  content,
  ai_provider,
  model,
  completed_at
)
select
  public.cases.id,
  public.cases.director_id,
  public.obituary_drafts.content,
  public.obituary_drafts.ai_provider,
  public.obituary_drafts.model,
  coalesce(public.obituary_drafts.updated_at, public.cases.updated_at)
from public.cases
join public.obituary_drafts
  on public.obituary_drafts.case_id = public.cases.id
where public.cases.status = 'delivered'
on conflict (case_id) do nothing;
