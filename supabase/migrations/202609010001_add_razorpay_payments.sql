create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  application_id uuid references public.applications(id) on delete set null,
  provider text not null default 'razorpay' check (provider in ('razorpay')),
  status text not null default 'created' check (status in ('created', 'verified', 'captured', 'failed')),
  pricing_tier text not null check (pricing_tier in ('solo', 'couple', 'family')),
  requested_credits integer not null check (requested_credits > 0),
  gross_amount_inr numeric(10,2) not null check (gross_amount_inr > 0),
  taxable_amount_inr numeric(10,2) not null check (taxable_amount_inr >= 0),
  gst_amount_inr numeric(10,2) not null check (gst_amount_inr >= 0),
  currency text not null default 'INR',
  provider_order_id text not null unique,
  provider_payment_id text unique,
  provider_signature text,
  receipt_number text not null unique,
  invoice_number text unique,
  invoice_storage_path text,
  invoice_issued_at timestamptz,
  customer_name text,
  customer_email text,
  destination_country text,
  notes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists payments_user_id_idx on public.payments (user_id, created_at desc);
create index if not exists payments_application_id_idx on public.payments (application_id);
create index if not exists payments_status_idx on public.payments (status, created_at desc);

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
before update on public.payments
for each row
execute function public.set_updated_at();

alter table public.payments enable row level security;

drop policy if exists payments_select_own on public.payments;
create policy payments_select_own
on public.payments
for select
to authenticated
using (auth.uid()::text = user_id);

create or replace function public.capture_payment_and_grant_credits(
  p_payment_id uuid,
  p_provider_payment_id text,
  p_provider_signature text,
  p_invoice_number text,
  p_invoice_storage_path text,
  p_event_type text,
  p_entity_id text,
  p_payload jsonb default '{}'::jsonb
)
returns table (
  payment_id uuid,
  user_id text,
  credits integer,
  status text,
  invoice_storage_path text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_credits integer;
begin
  select *
  into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment record not found.';
  end if;

  if v_payment.status = 'captured' then
    select credits into v_credits from public.users where id = v_payment.user_id;

    return query
    select v_payment.id, v_payment.user_id, coalesce(v_credits, 0), v_payment.status, v_payment.invoice_storage_path;
    return;
  end if;

  update public.payments
  set
    status = 'captured',
    provider_payment_id = p_provider_payment_id,
    provider_signature = p_provider_signature,
    invoice_number = p_invoice_number,
    invoice_storage_path = p_invoice_storage_path,
    invoice_issued_at = timezone('utc', now()),
    notes = coalesce(v_payment.notes, '{}'::jsonb) || p_payload,
    updated_at = timezone('utc', now())
  where id = p_payment_id;

  insert into public.users (id, email, credits)
  values (v_payment.user_id, coalesce(v_payment.customer_email, v_payment.user_id), v_payment.requested_credits)
  on conflict (id)
  do update set
    credits = public.users.credits + v_payment.requested_credits,
    email = coalesce(public.users.email, excluded.email),
    updated_at = timezone('utc', now())
  returning public.users.credits into v_credits;

  insert into public.audit_logs (event_type, actor_user_id, entity_type, entity_id, payload)
  values (p_event_type, v_payment.user_id, 'razorpay_payment', p_entity_id, p_payload);

  return query
  select v_payment.id, v_payment.user_id, v_credits, 'captured'::text, p_invoice_storage_path;
end;
$$;