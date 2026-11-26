create schema if not exists private;

create table if not exists private.discount_validation_rate_limits (
  client_ip inet primary key,
  window_started_at timestamptz not null,
  attempts integer not null check (attempts > 0)
);

create index if not exists discount_validation_rate_limits_window_idx
  on private.discount_validation_rate_limits (window_started_at);

revoke all on schema private from public, anon, authenticated;
revoke all on table private.discount_validation_rate_limits from public, anon, authenticated;

create or replace function public.validate_discount(p_code text, p_subtotal numeric)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_discount public.discounts%rowtype;
  v_headers jsonb;
  v_ip_text text;
  v_client_ip inet;
  v_attempts integer;
  v_now timestamptz := clock_timestamp();
begin
  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  exception when others then
    v_headers := '{}'::jsonb;
  end;

  v_ip_text := nullif(btrim(split_part(coalesce(v_headers->>'x-forwarded-for', ''), ',', 1)), '');
  begin
    v_client_ip := coalesce(v_ip_text::inet, '0.0.0.0'::inet);
  exception when others then
    v_client_ip := '0.0.0.0'::inet;
  end;

  -- Occasionally prune inactive IP buckets so this private table stays bounded.
  if random() < 0.01 then
    delete from private.discount_validation_rate_limits
    where window_started_at < v_now - interval '1 day';
  end if;

  insert into private.discount_validation_rate_limits as rate_limit
    (client_ip, window_started_at, attempts)
  values (v_client_ip, v_now, 1)
  on conflict (client_ip) do update set
    window_started_at = case
      when rate_limit.window_started_at <= v_now - interval '1 minute' then v_now
      else rate_limit.window_started_at
    end,
    attempts = case
      when rate_limit.window_started_at <= v_now - interval '1 minute' then 1
      else rate_limit.attempts + 1
    end
  returning attempts into v_attempts;

  if v_attempts > 10 then
    raise exception 'Too many discount attempts. Please wait a minute and try again' using errcode = 'P0001';
  end if;

  select * into v_discount from public.discounts
  where code = upper(trim(coalesce(p_code, ''))) and is_active
    and (starts_at is null or starts_at <= now())
    and (expires_at is null or expires_at >= now())
    and (usage_limit is null or usage_count < usage_limit)
    and (minimum_order is null or minimum_order <= p_subtotal);
  if not found then raise exception 'That discount code is not valid' using errcode = '22023'; end if;
  return jsonb_build_object('id', v_discount.id, 'code', v_discount.code,
    'type', v_discount.type, 'value', v_discount.value);
end;
$$;
