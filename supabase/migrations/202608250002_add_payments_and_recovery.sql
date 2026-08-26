create table if not exists public.users (
  id text primary key,
  email text,
  credits integer not null default 0 check (credits >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

alter table public.users enable row level security;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_user_id text,
  entity_type text not null,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_logs_event_type_idx on public.audit_logs (event_type);
create index if not exists audit_logs_actor_user_id_idx on public.audit_logs (actor_user_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

alter table public.applications
  add column if not exists user_id text,
  add column if not exists rejected_at timestamptz,
  add column if not exists refusal_reason_code smallint,
  add column if not exists recovery_status text not null default 'NOT_CLAIMED',
  add column if not exists recovery_claimed_at timestamptz;

update public.applications
set user_id = applicant_email
where user_id is null;

alter table public.applications
  alter column user_id set not null;

alter table public.applications
  drop constraint if exists applications_status_check;

alter table public.applications
  add constraint applications_status_check
  check (status in ('draft', 'paid', 'completed', 'expired', 'rejected'));

alter table public.applications
  drop constraint if exists applications_recovery_status_check;

alter table public.applications
  add constraint applications_recovery_status_check
  check (recovery_status in ('NOT_CLAIMED', 'CLAIMED'));

alter table public.applications
  drop constraint if exists applications_refusal_reason_code_check;

alter table public.applications
  add constraint applications_refusal_reason_code_check
  check (refusal_reason_code is null or refusal_reason_code between 1 and 11);

create index if not exists applications_user_id_idx on public.applications (user_id);
create index if not exists applications_rejected_at_idx on public.applications (rejected_at desc);

create or replace function public.grant_application_credits(
  p_user_id text,
  p_credit_delta integer,
  p_event_type text,
  p_entity_id text,
  p_payload jsonb default '{}'::jsonb
)
returns table (
  user_id text,
  credits integer
)
language plpgsql
security definer
as $$
declare
  v_credits integer;
begin
  if coalesce(trim(p_user_id), '') = '' then
    raise exception 'User ID is required.';
  end if;

  if p_credit_delta <= 0 then
    raise exception 'Credit delta must be positive.';
  end if;

  insert into public.users (id, email, credits)
  values (p_user_id, p_user_id, p_credit_delta)
  on conflict (id)
  do update set
    credits = public.users.credits + excluded.credits,
    email = coalesce(public.users.email, excluded.email),
    updated_at = timezone('utc', now())
  returning public.users.credits into v_credits;

  insert into public.audit_logs (event_type, actor_user_id, entity_type, entity_id, payload)
  values (p_event_type, p_user_id, 'stripe_checkout_session', p_entity_id, p_payload);

  return query
  select p_user_id, v_credits;
end;
$$;

create or replace function public.claim_reapplication_recovery_credit(
  p_original_application_id uuid,
  p_refusal_reason_code integer
)
returns table (
  application_id uuid,
  user_id text,
  credits integer,
  recovery_status text
)
language plpgsql
security definer
as $$
declare
  v_application public.applications%rowtype;
  v_credits integer;
begin
  if p_refusal_reason_code < 1 or p_refusal_reason_code > 11 then
    raise exception 'Refusal reason code must be between 1 and 11.';
  end if;

  select *
  into v_application
  from public.applications
  where id = p_original_application_id
  for update;

  if not found then
    raise exception 'Original application not found.';
  end if;

  if v_application.status <> 'rejected' then
    raise exception 'Only rejected applications can claim recovery credits.';
  end if;

  if v_application.rejected_at is null then
    raise exception 'Rejection date is missing for the original application.';
  end if;

  if v_application.rejected_at < timezone('utc', now()) - interval '30 days' then
    raise exception 'Recovery claims expire 30 days after rejection.';
  end if;

  if v_application.recovery_status = 'CLAIMED' then
    raise exception 'Recovery credit has already been claimed for this application.';
  end if;

  insert into public.users (id, email, credits)
  values (v_application.user_id, v_application.applicant_email, 1)
  on conflict (id)
  do update set
    credits = public.users.credits + 1,
    email = coalesce(public.users.email, excluded.email),
    updated_at = timezone('utc', now())
  returning public.users.credits into v_credits;

  update public.applications
  set
    refusal_reason_code = p_refusal_reason_code,
    recovery_status = 'CLAIMED',
    recovery_claimed_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = p_original_application_id;

  insert into public.audit_logs (event_type, actor_user_id, entity_type, entity_id, payload)
  values (
    'application.recovery.claimed',
    v_application.user_id,
    'application',
    v_application.id::text,
    jsonb_build_object(
      'refusalReasonCode', p_refusal_reason_code,
      'grantedCredits', 1
    )
  );

  return query
  select v_application.id, v_application.user_id, v_credits, 'CLAIMED'::text;
end;
$$;