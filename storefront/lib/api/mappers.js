export function assetUrl(value) {
  if (!value || /^https?:\/\//i.test(value)) return value || null;
  return value;
}

function optionEntries(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value).filter(([, option]) => ['string', 'number'].includes(typeof option));
}

const label = (value) => value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const number = (value) => value == null ? 0 : Number(value);

export function toProduct(product) {
  const variants = (product.variants || []).filter((variant) => variant.isActive !== false);
  const optionKeys = [...new Set(variants.flatMap((variant) => optionEntries(variant.options).map(([key]) => key)))];
  const mappedVariants = variants.map((variant) => {
    const regular = number(variant.price);
    const current = number(variant.salePrice ?? variant.price);
    const quantity = variant.inventory?.quantity ?? 0;
    return {
      ...variant,
      title: variant.title || 'Default',
      price: current,
      original: regular,
      quantity,
      available: variant.isActive !== false && quantity > 0,
      options: Object.fromEntries(optionKeys.map((key) => [key, String(variant.options?.[key] ?? '')])),
    };
  });
  const images = (product.images || []).map((image) => ({ ...image, url: assetUrl(image.url) }));
  const cheapest = [...mappedVariants].sort((a, b) => a.price - b.price)[0];
  const price = cheapest?.price ?? null;
  const original = cheapest?.original ?? null;
  const onSale = price != null && original > price;
  const collections = (product.collections || []).map((collection) => ({
    ...collection,
    handle: collection.slug,
    title: collection.name,
  }));
  const primaryCollection = collections[0] || null;

  return {
    ...product,
    handle: product.slug || product.id,
    subtitle: [product.brand, product.model].filter(Boolean).join(' · ') || null,
    thumbnail: images[0]?.url || null,
    images,
    variants: mappedVariants,
    options: optionKeys.map((key) => ({
      id: key,
      title: label(key),
      values: [...new Set(mappedVariants.map((variant) => variant.options[key]).filter(Boolean))],
    })),
    price,
    original,
    onSale,
    discount: onSale ? Math.round((1 - price / original) * 100) : 0,
    collection: primaryCollection,
    collections,
    metadata: {
      movement: product.movement,
      case_material: product.caseMaterial,
      dial_size: product.caseDiameter,
      strap_material: product.strapMaterial,
      water_resistance: product.waterResistance,
      dial_color: product.dialColor,
      warranty_period: product.warranty,
    },
  };
}

export function toCart(cart) {
  if (!cart) return null;
  const items = (cart.items || []).map((item) => {
    const variant = item.variant || {};
    const product = variant.product || {};
    const unitPrice = number(item.unitPrice ?? variant.salePrice ?? variant.price);
    return {
      ...item,
      variant_id: variant.id,
      product_title: product.title || variant.title || 'Watch',
      product_handle: product.slug,
      thumbnail: assetUrl(product.images?.[0]?.url),
      variant_title: variant.title,
      unit_price: unitPrice,
      total: unitPrice * item.quantity,
    };
  });
  const subtotal = items.reduce((total, item) => total + item.total, 0);
  const discount = cart.discount;
  const value = number(discount?.value);
  const discountTotal = discount?.type === 'PERCENTAGE'
    ? Math.min(subtotal * value / 100, subtotal)
    : Math.min(value, subtotal);

  return {
    ...cart,
    customer_id: cart.customerId,
    region_id: 'pk',
    items,
    item_subtotal: subtotal,
    subtotal,
    discount_total: discountTotal,
    shipping_total: 0,
    total: subtotal - discountTotal,
    promotions: discount ? [{ id: discount.id, code: discount.code }] : [],
  };
}

export function toOrder(order) {
  const status = String(order.status || 'PENDING').toLowerCase();
  const fulfillment = {
    pending: 'not_fulfilled',
    confirmed: 'not_fulfilled',
    processing: 'fulfilled',
    shipped: 'shipped',
    delivered: 'delivered',
    cancelled: 'canceled',
    returned: 'delivered',
  }[status] || 'not_fulfilled';
  return {
    ...order,
    display_id: order.orderNumber,
    currencyCode: order.currencyCode ?? order.currency_code ?? 'PKR',
    created_at: order.createdAt,
    status,
    fulfillment_status: fulfillment,
    payment_status: order.payments?.some((payment) => payment.status === 'PAID') ? 'captured' : 'awaiting',
    subtotal: number(order.subtotal),
    item_subtotal: number(order.subtotal),
    discount_total: number(order.discountTotal),
    shipping_total: number(order.shippingTotal),
    total: number(order.total),
    shipping_address: {
      first_name: order.shippingFirstName,
      last_name: order.shippingLastName,
      address_1: order.shippingAddress1,
      address_2: order.shippingAddress2,
      city: order.shippingCity,
      postal_code: order.shippingPostalCode,
      phone: order.shippingPhone,
    },
    items: (order.items || []).map((item) => ({
      ...item,
      product_title: item.productTitle,
      variant_title: item.variantTitle,
      quantity: item.quantity,
      total: number(item.lineTotal),
      unit_price: number(item.unitPrice),
    })),
  };
}
