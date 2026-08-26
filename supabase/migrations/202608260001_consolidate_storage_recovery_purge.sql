begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'visapilot-supporting-documents',
  'visapilot-supporting-documents',
  false,
  10485760,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists supporting_documents_select_own on storage.objects;
drop policy if exists supporting_documents_insert_own on storage.objects;
drop policy if exists supporting_documents_delete_own on storage.objects;

create policy supporting_documents_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'visapilot-supporting-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy supporting_documents_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'visapilot-supporting-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy supporting_documents_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'visapilot-supporting-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.claim_reapplication_recovery_credit(
  p_original_application_id uuid,
  p_refusal_reason_code integer default null
)
returns table (
  application_id uuid,
  user_id text,
  credits integer,
  recovery_status text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id text;
  v_application public.applications%rowtype;
  v_credits integer;
begin
  v_actor_user_id := auth.uid()::text;

  if coalesce(v_actor_user_id, '') = '' then
    raise exception 'Authenticated session required.';
  end if;

  if p_refusal_reason_code is not null and (p_refusal_reason_code < 1 or p_refusal_reason_code > 11) then
    raise exception 'Refusal reason code must be between 1 and 11 when provided.';
  end if;

  select *
  into v_application
  from public.applications
  where id = p_original_application_id
  for update;

  if not found then
    raise exception 'Original application not found.';
  end if;

  if v_application.user_id <> v_actor_user_id then
    raise exception 'You do not have access to this application.';
  end if;

  if v_application.status <> 'rejected' then
    raise exception 'Only rejected applications can activate free re-application.';
  end if;

  if v_application.recovery_status = 'CLAIMED' then
    raise exception 'Free re-application has already been used for this application.';
  end if;

  if coalesce(v_application.privacy_purge_at, v_application.created_at + interval '90 days') <= timezone('utc', now()) then
    raise exception 'The 90-day application support window has expired.';
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
    status = 'reapplied',
    refusal_reason_code = coalesce(p_refusal_reason_code, v_application.refusal_reason_code),
    recovery_status = 'CLAIMED',
    recovery_claimed_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = p_original_application_id;

  insert into public.audit_logs (event_type, actor_user_id, entity_type, entity_id, payload)
  values (
    'application.reapplication.activated',
    v_application.user_id,
    'application',
    v_application.id::text,
    jsonb_build_object(
      'refusalReasonCode', p_refusal_reason_code,
      'grantedCredits', 1,
      'windowDays', 90,
      'mode', 'credit-plus-reapply'
    )
  );

  return query
  select v_application.id, v_application.user_id, v_credits, 'CLAIMED'::text, 'reapplied'::text;
end;
$$;

create or replace function public.purge_expired_private_data()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.applications
  where coalesce(privacy_purge_at, created_at + interval '90 days') <= timezone('utc', now());

  get diagnostics deleted_count = row_count;

  delete from public.applicants applicant_record
  where not exists (
    select 1
    from public.applications application_record
    where application_record.applicant_id = applicant_record.id
  );

  return deleted_count;
end;
$$;

do $$
declare
  scheduled_job record;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise exception 'pg_cron extension is required for auto-purge scheduling.';
  end if;

  for scheduled_job in
    select jobid
    from cron.job
    where jobname in (
      'visapilot-hard-purge-private-data',
      'auto-purge-90-day-applications',
      'visapilot-canonical-privacy-purge'
    )
  loop
    perform cron.unschedule(scheduled_job.jobid);
  end loop;

  perform cron.schedule(
    'visapilot-canonical-privacy-purge',
    '0 3 * * *',
    $job$select public.purge_expired_private_data();$job$
  );
exception
  when undefined_table then
    raise exception 'pg_cron metadata tables are unavailable; install pg_cron before running this migration.';
end;
$$;

commit;