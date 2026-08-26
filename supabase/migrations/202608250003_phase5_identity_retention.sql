create table if not exists public.applicants (
  id text primary key,
  user_id text not null,
  full_name text not null,
  passport_number text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists applicants_set_updated_at on public.applicants;
create trigger applicants_set_updated_at
before update on public.applicants
for each row
execute function public.set_updated_at();

alter table public.applicants enable row level security;

alter table public.applications
  add column if not exists applicant_id text,
  add column if not exists privacy_purge_at timestamptz not null default (timezone('utc', now()) + interval '90 days');

update public.applications
set applicant_id = coalesce(applicant_id, user_id)
where applicant_id is null;

alter table public.applications
  alter column applicant_id set not null;

alter table public.applications
  drop constraint if exists applications_status_check;

alter table public.applications
  add constraint applications_status_check
  check (status in ('draft', 'paid', 'completed', 'expired', 'rejected', 'reapplied'));

create index if not exists applications_applicant_id_idx on public.applications (applicant_id);
create index if not exists applications_privacy_purge_at_idx on public.applications (privacy_purge_at);

create or replace function public.purge_expired_private_data()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.applications
  where privacy_purge_at <= timezone('utc', now());

  delete from public.applicants a
  where not exists (
    select 1 from public.applications app where app.applicant_id = a.id
  );
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if not exists (
      select 1 from cron.job where jobname = 'visapilot-hard-purge-private-data'
    ) then
      perform cron.schedule(
        'visapilot-hard-purge-private-data',
        '0 3 * * *',
        $$select public.purge_expired_private_data();$$
      );
    end if;
  end if;
exception when undefined_table then
  null;
end;
$$;