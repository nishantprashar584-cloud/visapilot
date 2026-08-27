begin;

create table if not exists public.api_rate_limits (
  scope text not null,
  identifier text not null,
  count integer not null default 1 check (count >= 0),
  reset_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (scope, identifier)
);

drop trigger if exists api_rate_limits_set_updated_at on public.api_rate_limits;
create trigger api_rate_limits_set_updated_at
before update on public.api_rate_limits
for each row
execute function public.set_updated_at();

alter table public.api_rate_limits enable row level security;

create index if not exists api_rate_limits_reset_at_idx on public.api_rate_limits (reset_at);

create or replace function public.consume_api_rate_limit(
  p_scope text,
  p_identifier text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_reset_at timestamptz;
  v_existing public.api_rate_limits%rowtype;
  v_next_count integer;
begin
  if coalesce(trim(p_scope), '') = '' then
    raise exception 'Rate limit scope is required.';
  end if;

  if coalesce(trim(p_identifier), '') = '' then
    raise exception 'Rate limit identifier is required.';
  end if;

  if coalesce(p_limit, 0) < 1 then
    raise exception 'Rate limit must be at least 1.';
  end if;

  if coalesce(p_window_seconds, 0) < 1 then
    raise exception 'Rate limit window must be at least 1 second.';
  end if;

  delete from public.api_rate_limits where reset_at <= v_now;

  select *
  into v_existing
  from public.api_rate_limits
  where scope = p_scope
    and identifier = p_identifier
  for update;

  if not found then
    v_reset_at := v_now + make_interval(secs => p_window_seconds);

    insert into public.api_rate_limits (scope, identifier, count, reset_at)
    values (p_scope, p_identifier, 1, v_reset_at);

    return jsonb_build_object(
      'allowed', true,
      'remaining', greatest(p_limit - 1, 0),
      'resetAt', floor(extract(epoch from v_reset_at) * 1000),
      'retryAfterSeconds', p_window_seconds
    );
  end if;

  if v_existing.count >= p_limit then
    return jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'resetAt', floor(extract(epoch from v_existing.reset_at) * 1000),
      'retryAfterSeconds', greatest(1, ceil(extract(epoch from v_existing.reset_at - v_now)))
    );
  end if;

  update public.api_rate_limits
  set count = v_existing.count + 1,
      updated_at = timezone('utc', now())
  where scope = p_scope
    and identifier = p_identifier
  returning count, reset_at into v_next_count, v_reset_at;

  return jsonb_build_object(
    'allowed', true,
    'remaining', greatest(p_limit - v_next_count, 0),
    'resetAt', floor(extract(epoch from v_reset_at) * 1000),
    'retryAfterSeconds', greatest(1, ceil(extract(epoch from v_reset_at - v_now)))
  );
end;
$$;

grant execute on function public.consume_api_rate_limit(text, text, integer, integer) to anon, authenticated;

create or replace function public.cleanup_application_storage_objects()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  delete from storage.objects
  where bucket_id = 'visapilot-supporting-documents'
    and name in (
      select item->>'storagePath'
      from jsonb_array_elements(coalesce(old.application_data->'supportingDocuments', '[]'::jsonb)) as item
      where coalesce(item->>'storagePath', '') <> ''
    );

  delete from storage.objects
  where bucket_id = 'passport-scans'
    and (
      name like old.user_id || '/' || old.id::text || '%'
      or name like old.user_id || '/' || old.applicant_id || '%'
    );

  delete from storage.objects
  where bucket_id = 'generated-packets'
    and (
      name like old.user_id || '/' || old.id::text || '%'
      or name like old.user_id || '/' || old.applicant_id || '%'
    );

  return old;
end;
$$;

drop trigger if exists applications_cleanup_storage_objects on public.applications;
create trigger applications_cleanup_storage_objects
after delete on public.applications
for each row
execute function public.cleanup_application_storage_objects();

commit;