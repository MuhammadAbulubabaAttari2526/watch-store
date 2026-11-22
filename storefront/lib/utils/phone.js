// Pakistani numbers: mobile 03XX XXXXXXX, or landline with area code. Returns +92... or null.
export function normalizePkPhone(raw) {
  const d = String(raw || '').replace(/[\s\-()]/g, '');
  let m = d.match(/^(?:\+92|0092|92|0)?(3\d{9})$/);
  if (m) return '+92' + m[1];
  m = d.match(/^(?:\+92|0092|0)([2-9]\d{8,9})$/);
  return m ? '+92' + m[1] : null;
}
export const PK_CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Hyderabad', 'Sialkot', 'Gujranwala', 'Sukkur', 'Bahawalpur', 'Abbottabad'];
