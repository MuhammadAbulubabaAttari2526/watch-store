export const formatPrice = (n) => (n == null ? '' : `Rs ${Math.round(n).toLocaleString('en-PK')}`);
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
export const whatsappUrl = (text = 'Hello VELTRIX, I have a question.') => {
  const n = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '').replace(/\D/g, '');
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
};
// Spec labels shown on product pages. Only keys the admin actually filled in are displayed.
export const SPEC_LABELS = {
  movement: 'Movement', case_material: 'Case material', dial_size: 'Dial size', strap_material: 'Strap material',
  water_resistance: 'Water resistance', dial_color: 'Dial colour', style: 'Style',
};
