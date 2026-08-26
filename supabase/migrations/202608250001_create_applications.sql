create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'draft' check (status in ('draft', 'paid', 'completed', 'expired')),
  applicant_name text not null,
  applicant_email text not null,
  destination_country text not null,
  application_data jsonb not null,
  cover_letter_markdown text not null,
  filled_pdf_base64 text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists applications_status_idx on public.applications (status);
create index if not exists applications_destination_country_idx on public.applications (destination_country);
create index if not exists applications_created_at_idx on public.applications (created_at desc);

drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at
before update on public.applications
for each row
execute function public.set_updated_at();

alter table public.applications enable row level security;