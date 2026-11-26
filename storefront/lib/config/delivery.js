// Courier timelines are separate from delivery charges, which come from Supabase store settings.
import { PK_CITIES } from '../utils/phone.js';

export const ETA_DEFAULT = '3 to 6 working days';
export const ETA = {
  karachi: '1 to 2 working days',
  lahore: '2 to 4 working days', islamabad: '2 to 4 working days', rawalpindi: '2 to 4 working days',
  faisalabad: '2 to 4 working days', multan: '2 to 4 working days', hyderabad: '2 to 3 working days',
  peshawar: '3 to 5 working days', quetta: '4 to 7 working days',
};
export const etaFor = (city) => {
  const c = (city || '').toLowerCase();
  const hit = Object.keys(ETA).find((k) => c.includes(k));
  return hit ? ETA[hit] : ETA_DEFAULT;
};

export const restrictedCity = (name) => PK_CITIES.find((c) => (name || '').toLowerCase().includes(c.toLowerCase())) || null;

export function optionsForCity(options, city) {
  const c = (city || '').trim().toLowerCase();
  if (!c) return options;
  const local = options.filter((o) => { const r = restrictedCity(o.name); return r && c.includes(r.toLowerCase()); });
  if (local.length) return local;
  const general = options.filter((o) => !restrictedCity(o.name));
  return general.length ? general : options;
}
