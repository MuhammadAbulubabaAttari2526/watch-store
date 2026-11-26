create schema if not exists private;

create or replace function private.sync_payment_status_after_order_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('CANCELLED', 'RETURNED') then
    update public.payments
    set status = 'REFUNDED',
        verified_at = null,
        updated_at = now()
    where order_id = new.id
      and status = 'PAID';
  elsif new.status = 'DELIVERED' then
    update public.payments
    set status = 'PAID',
        verified_at = now(),
        updated_at = now()
    where order_id = new.id
      and method = 'COD'
      and status not in ('PAID', 'REFUNDED');
  end if;

  return new;
end;
$$;

revoke all on function private.sync_payment_status_after_order_transition() from public, anon, authenticated;

drop trigger if exists sync_payment_status_after_order_transition on public.orders;
create trigger sync_payment_status_after_order_transition
after update of status on public.orders
for each row
when (old.status is distinct from new.status)
execute function private.sync_payment_status_after_order_transition();
