create or replace function public.claim_reapplication_recovery_credit(
  p_original_application_id uuid,
  p_refusal_reason_code integer default null
)
returns table (
  application_id uuid,
  user_id text,
  recovery_status text,
  status text
)
language plpgsql
security definer
as $$
declare
  v_application public.applications%rowtype;
begin
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

  if v_application.status <> 'rejected' then
    raise exception 'Only rejected applications can activate free re-application.';
  end if;

  if v_application.recovery_status = 'CLAIMED' then
    raise exception 'Free re-application has already been used for this application.';
  end if;

  if v_application.privacy_purge_at <= timezone('utc', now()) then
    raise exception 'The 90-day application support window has expired.';
  end if;

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
      'windowDays', 90,
      'mode', 'same-application-retry'
    )
  );

  return query
  select v_application.id, v_application.user_id, 'CLAIMED'::text, 'reapplied'::text;
end;
$$;