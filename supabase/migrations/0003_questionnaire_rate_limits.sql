create table public.questionnaire_rate_limits (
  case_id uuid not null references public.cases(id) on delete cascade,
  ip_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  primary key (case_id, ip_hash, window_start)
);

create index questionnaire_rate_limits_window_start_idx
  on public.questionnaire_rate_limits (window_start);

alter table public.questionnaire_rate_limits enable row level security;

create or replace function public.enforce_questionnaire_rate_limit(
  p_case_id uuid,
  p_ip_hash text,
  p_window_seconds integer default 900,
  p_max_requests integer default 60
)
returns table (
  allowed boolean,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  bucket_start timestamptz;
  current_count integer;
begin
  if p_window_seconds <= 0 or p_max_requests <= 0 then
    raise exception 'Invalid rate limit configuration';
  end if;

  bucket_start :=
    to_timestamp(
      floor(extract(epoch from timezone('utc', now())) / p_window_seconds) * p_window_seconds
    );

  insert into public.questionnaire_rate_limits (
    case_id,
    ip_hash,
    window_start,
    request_count
  )
  values (
    p_case_id,
    p_ip_hash,
    bucket_start,
    1
  )
  on conflict (case_id, ip_hash, window_start)
  do update
    set request_count = public.questionnaire_rate_limits.request_count + 1
  returning public.questionnaire_rate_limits.request_count
  into current_count;

  allowed := current_count <= p_max_requests;
  remaining := greatest(p_max_requests - current_count, 0);
  reset_at := bucket_start + make_interval(secs => p_window_seconds);

  return next;
end;
$$;

revoke all
on function public.enforce_questionnaire_rate_limit(uuid, text, integer, integer)
from public;

grant execute
on function public.enforce_questionnaire_rate_limit(uuid, text, integer, integer)
to postgres, service_role;
