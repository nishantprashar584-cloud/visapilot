begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'service_track') then
    create type public.service_track as enum ('APPLY_MYSELF', 'VIP_CONCIERGE');
  end if;

  if not exists (select 1 from pg_type where typname = 'package_tier') then
    create type public.package_tier as enum ('SOLO', 'COUPLE', 'FAMILY');
  end if;

  if not exists (select 1 from pg_type where typname = 'country_submission_type') then
    create type public.country_submission_type as enum ('PORTAL_ONLINE', 'PAPER_PDF');
  end if;

  if not exists (select 1 from pg_type where typname = 'traveler_role') then
    create type public.traveler_role as enum ('PRIMARY', 'SPOUSE', 'ADULT_DEPENDENT', 'MINOR');
  end if;
end $$;

alter table public.applications
  add column if not exists submission_type public.country_submission_type,
  add column if not exists track public.service_track not null default 'APPLY_MYSELF',
  add column if not exists tier public.package_tier not null default 'SOLO',
  add column if not exists total_amount_inr numeric(10,2),
  add column if not exists gst_amount_inr numeric(10,2),
  add column if not exists appointment_date timestamptz,
  add column if not exists vfs_center_location varchar(100);

update public.applications
set
  submission_type = case
    when upper(destination_country) in ('FRANCE', 'GERMANY', 'SWITZERLAND') then 'PORTAL_ONLINE'::public.country_submission_type
    else 'PAPER_PDF'::public.country_submission_type
  end,
  total_amount_inr = coalesce(total_amount_inr, 0),
  gst_amount_inr = coalesce(gst_amount_inr, 0)
where submission_type is null
   or total_amount_inr is null
   or gst_amount_inr is null;

alter table public.applications
  alter column submission_type set not null,
  alter column total_amount_inr set not null,
  alter column gst_amount_inr set not null;

create table if not exists public.travelers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  role public.traveler_role not null default 'PRIMARY',
  first_name varchar(100) not null,
  last_name varchar(100) not null,
  passport_number varchar(20) not null,
  passport_expiry_date date not null,
  is_sponsored boolean not null default false,
  sponsor_traveler_id uuid references public.travelers(id),
  employment_type varchar(50),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  traveler_id uuid references public.travelers(id) on delete cascade,
  document_type varchar(50) not null,
  file_path text not null,
  is_verified boolean not null default false,
  rejection_reason text,
  expires_at timestamptz not null default (timezone('utc', now()) + interval '30 days'),
  uploaded_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.vip_action_requests (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  action_type varchar(50) not null,
  prompt_message text not null,
  status varchar(20) not null default 'PENDING',
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.travelers enable row level security;
alter table public.application_documents enable row level security;
alter table public.vip_action_requests enable row level security;

drop policy if exists travelers_select_own on public.travelers;
drop policy if exists travelers_insert_own on public.travelers;
drop policy if exists travelers_update_own on public.travelers;
drop policy if exists application_documents_select_own on public.application_documents;
drop policy if exists application_documents_insert_own on public.application_documents;
drop policy if exists application_documents_update_own on public.application_documents;
drop policy if exists vip_action_requests_select_own on public.vip_action_requests;
drop policy if exists vip_action_requests_insert_admin_or_owner on public.vip_action_requests;
drop policy if exists vip_action_requests_update_admin_or_owner on public.vip_action_requests;

create policy travelers_select_own
on public.travelers
for select
to authenticated
using (
  exists (
    select 1
    from public.applications
    where applications.id = travelers.application_id
      and applications.user_id = auth.uid()::text
  )
);

create policy travelers_insert_own
on public.travelers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.applications
    where applications.id = travelers.application_id
      and applications.user_id = auth.uid()::text
  )
);

create policy travelers_update_own
on public.travelers
for update
to authenticated
using (
  exists (
    select 1
    from public.applications
    where applications.id = travelers.application_id
      and applications.user_id = auth.uid()::text
  )
)
with check (
  exists (
    select 1
    from public.applications
    where applications.id = travelers.application_id
      and applications.user_id = auth.uid()::text
  )
);

create policy application_documents_select_own
on public.application_documents
for select
to authenticated
using (
  exists (
    select 1
    from public.applications
    where applications.id = application_documents.application_id
      and applications.user_id = auth.uid()::text
  )
);

create policy application_documents_insert_own
on public.application_documents
for insert
to authenticated
with check (
  exists (
    select 1
    from public.applications
    where applications.id = application_documents.application_id
      and applications.user_id = auth.uid()::text
  )
  and file_path like 'applicant-documents/' || auth.uid()::text || '/%'
);

create policy application_documents_update_own
on public.application_documents
for update
to authenticated
using (
  exists (
    select 1
    from public.applications
    where applications.id = application_documents.application_id
      and applications.user_id = auth.uid()::text
  )
)
with check (
  exists (
    select 1
    from public.applications
    where applications.id = application_documents.application_id
      and applications.user_id = auth.uid()::text
  )
  and file_path like 'applicant-documents/' || auth.uid()::text || '/%'
);

create policy vip_action_requests_select_own
on public.vip_action_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.applications
    where applications.id = vip_action_requests.application_id
      and applications.user_id = auth.uid()::text
  )
);

create policy vip_action_requests_insert_admin_or_owner
on public.vip_action_requests
for insert
to authenticated
with check (
  exists (
    select 1
    from public.applications
    where applications.id = vip_action_requests.application_id
      and applications.user_id = auth.uid()::text
  )
);

create policy vip_action_requests_update_admin_or_owner
on public.vip_action_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.applications
    where applications.id = vip_action_requests.application_id
      and applications.user_id = auth.uid()::text
  )
)
with check (
  exists (
    select 1
    from public.applications
    where applications.id = vip_action_requests.application_id
      and applications.user_id = auth.uid()::text
  )
);

create index if not exists applications_track_idx on public.applications (track);
create index if not exists applications_tier_idx on public.applications (tier);
create index if not exists applications_submission_type_idx on public.applications (submission_type);
create index if not exists applications_appointment_date_idx on public.applications (appointment_date);
create index if not exists travelers_application_id_idx on public.travelers (application_id);
create index if not exists application_documents_application_id_idx on public.application_documents (application_id);
create index if not exists application_documents_expires_at_idx on public.application_documents (expires_at);
create index if not exists vip_action_requests_application_id_idx on public.vip_action_requests (application_id);
create index if not exists vip_action_requests_status_idx on public.vip_action_requests (status);

commit;