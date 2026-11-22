import { getSupabaseServer } from '@/lib/supabase/server';
import { toOrder } from '@/lib/api/mappers';

const mapAddress = (address) => ({
  ...address,
  address_name: address.label,
  first_name: address.first_name,
  last_name: address.last_name,
  address_1: address.address_line1,
  address_2: address.address_line2,
  postal_code: address.postal_code,
  is_default_shipping: address.is_default,
});

function mapOrder(order) {
  return {
    ...order,
    orderNumber: order.order_number,
    customerId: order.customer_id,
    contactEmail: order.contact_email,
    orderNotes: order.order_notes,
    paymentMethod: order.payment_method,
    currencyCode: order.currency_code,
    discountTotal: order.discount_total,
    shippingTotal: order.shipping_total,
    discountId: order.discount_id,
    shippingFirstName: order.shipping_first_name,
    shippingLastName: order.shipping_last_name,
    shippingAddress1: order.shipping_address1,
    shippingAddress2: order.shipping_address2,
    shippingCity: order.shipping_city,
    shippingRegion: order.shipping_region,
    shippingPostalCode: order.shipping_postal_code,
    shippingCountryCode: order.shipping_country_code,
    shippingPhone: order.shipping_phone,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    items: (order.order_items || []).map((item) => ({
      ...item,
      productTitle: item.product_title,
      variantTitle: item.variant_title,
      unitPrice: item.unit_price,
      lineTotal: item.line_total,
    })),
    payments: order.payments || [],
  };
}

export async function getCustomer() {
  const supabase = getSupabaseServer();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError?.name === 'AuthSessionMissingError' ||
      authError?.message?.toLowerCase().includes('auth session missing')) {
    return null;
  }
  if (authError) throw new Error(`Could not verify customer session: ${authError.message}`);
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*,addresses(*)')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw new Error(`Could not load customer profile: ${error.message}`);
  if (!data || data.status !== 'ACTIVE') return null;
  return {
    ...data,
    email: user.email,
    first_name: data.first_name,
    last_name: data.last_name,
    addresses: (data.addresses || []).map(mapAddress),
  };
}

export async function listOrders(page = 1, limit = 10) {
  const supabase = getSupabaseServer();
  const start = (page - 1) * limit;
  const { data, count, error } = await supabase
    .from('orders')
    .select('*,order_items(*),payments(*)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, start + limit - 1);
  if (error) throw new Error(`Could not load orders: ${error.message}`);
  const total = count || 0;
  return {
    orders: (data || []).map((order) => toOrder(mapOrder(order))),
    count: total,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getOrder(id) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('orders')
    .select('*,order_items(*),payments(*),order_timeline(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Could not load order: ${error.message}`);
  return data ? toOrder(mapOrder(data)) : null;
}
