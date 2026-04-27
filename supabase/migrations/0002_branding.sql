create table public.director_profiles (
  director_id uuid primary key references auth.users(id) on delete cascade,
  organization_name text,
  logo_path text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_director_profiles_updated_at
before update on public.director_profiles
for each row
execute function public.set_updated_at();

alter table public.director_profiles enable row level security;

create policy "directors_select_own_profile"
on public.director_profiles
for select
using (director_id = auth.uid());

create policy "directors_insert_own_profile"
on public.director_profiles
for insert
with check (director_id = auth.uid());

create policy "directors_update_own_profile"
on public.director_profiles
for update
using (director_id = auth.uid())
with check (director_id = auth.uid());

create policy "directors_delete_own_profile"
on public.director_profiles
for delete
using (director_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('director-logos', 'director-logos', true)
on conflict (id) do nothing;

create policy "Directors can upload own logos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'director-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Directors can update own logos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'director-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'director-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Directors can delete own logos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'director-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Anyone can read director logos"
on storage.objects
for select
using (bucket_id = 'director-logos');
