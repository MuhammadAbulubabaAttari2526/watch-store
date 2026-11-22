export const formatPrice = (n, currency = 'PKR') => {
  if (n == null) return '';
  if (currency === 'PKR') return `Rs ${Math.round(n).toLocaleString('en-PK')}`;
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return `${currency} ${Math.round(n).toLocaleString('en')}`;
  }
};
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
export const whatsappUrl = (text = 'Hello VELTRIX, I have a question.', number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER) => {
  const n = String(number || '').replace(/\D/g, '');
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
};
// Spec labels shown on product pages. Only keys the admin actually filled in are displayed.
export const SPEC_LABELS = {
  movement: 'Movement', case_material: 'Case material', dial_size: 'Dial size', strap_material: 'Strap material',
  water_resistance: 'Water resistance', dial_color: 'Dial colour', style: 'Style',
};
