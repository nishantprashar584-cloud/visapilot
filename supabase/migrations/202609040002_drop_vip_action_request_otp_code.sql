begin;

alter table if exists public.vip_action_requests
  drop column if exists otp_code;

commit;