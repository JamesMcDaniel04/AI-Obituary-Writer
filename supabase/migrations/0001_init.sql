create extension if not exists pgcrypto;

create type case_status as enum ('questionnaire_sent', 'draft_ready', 'delivered');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  director_id uuid not null references auth.users(id) on delete cascade,
  family_name text not null,
  status case_status not null default 'questionnaire_sent',
  questionnaire_token text not null unique check (char_length(questionnaire_token) = 32),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index cases_director_id_created_at_idx
  on public.cases (director_id, created_at desc);

create trigger set_cases_updated_at
before update on public.cases
for each row
execute function public.set_updated_at();

create table public.questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  question_key text not null,
  answer text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (case_id, question_key)
);

create table public.obituary_drafts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.cases(id) on delete cascade,
  content text not null,
  ai_provider text not null,
  model text not null,
  generated_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_obituary_drafts_updated_at
before update on public.obituary_drafts
for each row
execute function public.set_updated_at();

create table public.obituary_edits (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  director_id uuid not null references auth.users(id) on delete cascade,
  content_before text not null,
  content_after text not null,
  edited_at timestamptz not null default timezone('utc', now())
);

create index obituary_edits_case_id_edited_at_idx
  on public.obituary_edits (case_id, edited_at desc);

alter table public.cases enable row level security;
alter table public.questionnaire_responses enable row level security;
alter table public.obituary_drafts enable row level security;
alter table public.obituary_edits enable row level security;

create policy "directors_select_own_cases"
on public.cases
for select
using (auth.uid() = director_id);

create policy "directors_insert_own_cases"
on public.cases
for insert
with check (auth.uid() = director_id);

create policy "directors_update_own_cases"
on public.cases
for update
using (auth.uid() = director_id)
with check (auth.uid() = director_id);

create policy "directors_delete_own_cases"
on public.cases
for delete
using (auth.uid() = director_id);

create policy "directors_select_own_drafts"
on public.obituary_drafts
for select
using (
  exists (
    select 1
    from public.cases
    where public.cases.id = public.obituary_drafts.case_id
      and public.cases.director_id = auth.uid()
  )
);

create policy "directors_insert_own_drafts"
on public.obituary_drafts
for insert
with check (
  exists (
    select 1
    from public.cases
    where public.cases.id = public.obituary_drafts.case_id
      and public.cases.director_id = auth.uid()
  )
);

create policy "directors_update_own_drafts"
on public.obituary_drafts
for update
using (
  exists (
    select 1
    from public.cases
    where public.cases.id = public.obituary_drafts.case_id
      and public.cases.director_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.cases
    where public.cases.id = public.obituary_drafts.case_id
      and public.cases.director_id = auth.uid()
  )
);

create policy "directors_select_own_edits"
on public.obituary_edits
for select
using (
  director_id = auth.uid()
  and exists (
    select 1
    from public.cases
    where public.cases.id = public.obituary_edits.case_id
      and public.cases.director_id = auth.uid()
  )
);

create policy "directors_insert_own_edits"
on public.obituary_edits
for insert
with check (
  director_id = auth.uid()
  and exists (
    select 1
    from public.cases
    where public.cases.id = public.obituary_edits.case_id
      and public.cases.director_id = auth.uid()
  )
);
