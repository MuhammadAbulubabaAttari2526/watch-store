create schema if not exists private;

create or replace function private.validate_checkout_order_text_lengths()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if char_length(coalesce(new.order_notes, '')) > 1000 then
    raise exception 'Order notes cannot exceed 1000 characters' using errcode = '22023';
  end if;
  if char_length(coalesce(new.shipping_address1, '')) > 255 then
    raise exception 'Address line 1 cannot exceed 255 characters' using errcode = '22023';
  end if;
  if char_length(coalesce(new.shipping_address2, '')) > 255 then
    raise exception 'Address line 2 cannot exceed 255 characters' using errcode = '22023';
  end if;
  if char_length(coalesce(new.shipping_city, '')) > 100 then
    raise exception 'City cannot exceed 100 characters' using errcode = '22023';
  end if;
  if char_length(coalesce(new.shipping_region, '')) > 100 then
    raise exception 'Region cannot exceed 100 characters' using errcode = '22023';
  end if;
  if char_length(coalesce(new.shipping_postal_code, '')) > 20 then
    raise exception 'Postal code cannot exceed 20 characters' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_checkout_order_text_lengths() from public, anon, authenticated;

drop trigger if exists validate_checkout_order_text_lengths on public.orders;
create trigger validate_checkout_order_text_lengths
before insert or update on public.orders
for each row
execute function private.validate_checkout_order_text_lengths();
