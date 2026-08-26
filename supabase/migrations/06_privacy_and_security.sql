begin;

alter table if exists public.applications
  add constraint applications_applicant_id_fkey
  foreign key (applicant_id)
  references public.applicants(id)
  on delete cascade;

create or replace function public.purge_expired_applications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.applications
  where created_at < now() - interval '90 days';

  get diagnostics deleted_count = row_count;

  return deleted_count;
end;
$$;

drop policy if exists applicants_select_own on public.applicants;
drop policy if exists applicants_insert_own on public.applicants;
drop policy if exists applicants_update_own on public.applicants;
drop policy if exists applications_select_own on public.applications;
drop policy if exists applications_insert_own on public.applications;
drop policy if exists applications_update_own on public.applications;
drop policy if exists audit_logs_service_role_read on public.audit_logs;
drop policy if exists audit_logs_service_role_insert on public.audit_logs;

create policy applicants_select_own
on public.applicants
for select
to authenticated
using (auth.uid()::text = user_id);

create policy applicants_insert_own
on public.applicants
for insert
to authenticated
with check (auth.uid()::text = user_id);

create policy applicants_update_own
on public.applicants
for update
to authenticated
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

create policy applications_select_own
on public.applications
for select
to authenticated
using (auth.uid()::text = user_id);

create policy applications_insert_own
on public.applications
for insert
to authenticated
with check (auth.uid()::text = user_id);

create policy applications_update_own
on public.applications
for update
to authenticated
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

create policy audit_logs_service_role_read
on public.audit_logs
for select
to service_role
using (true);

create policy audit_logs_service_role_insert
on public.audit_logs
for insert
to service_role
with check (true);

create or replace function public.assert_expected_cascade_constraints()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cascade_constraint_count integer;
begin
  select count(*)
  into cascade_constraint_count
  from pg_constraint c
  join pg_class child on child.oid = c.conrelid
  join pg_namespace namespace_ref on namespace_ref.oid = child.relnamespace
  where c.contype = 'f'
    and namespace_ref.nspname = 'public'
    and child.relname in ('applications')
    and c.confdeltype = 'c';

  if cascade_constraint_count < 1 then
    raise exception 'Expected ON DELETE CASCADE constraints were not found for application child relationships.';
  end if;
end;
$$;

select public.assert_expected_cascade_constraints();

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if not exists (
      select 1
      from cron.job
      where jobname = 'auto-purge-90-day-applications'
    ) then
      perform cron.schedule(
        'auto-purge-90-day-applications',
        '0 0 * * *',
        'select public.purge_expired_applications();'
      );
    end if;
  else
    raise exception 'pg_cron extension is required for auto-purge scheduling.';
  end if;
exception
  when undefined_table then
    raise exception 'pg_cron metadata tables are unavailable; install pg_cron before running this migration.';
end;
$$;

commit;