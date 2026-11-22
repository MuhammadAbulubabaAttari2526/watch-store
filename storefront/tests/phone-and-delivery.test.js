import { describe, expect, it } from 'vitest';
import { normalizePkPhone, PK_CITIES } from '../lib/utils/phone.js';
import { etaFor, optionsForCity, restrictedCity, ETA_DEFAULT } from '../lib/config/delivery.js';

const VALID = [['0300 1234567', '+923001234567'], ['0300-1234567', '+923001234567'], ['+92 300 1234567', '+923001234567'], ['923001234567', '+923001234567'], ['0092 300 1234567', '+923001234567'], ['3001234567', '+923001234567'], ['021 34567890', '+922134567890'], ['(042) 35761234', '+924235761234']];
const INVALID = ['', '0300123', '030012345678', '+1 202 555 0100', '1234567890123', 'abcdefghijk', '0300 12345 67 89', '00'];

describe('Pakistani phone numbers', () => {
  it.each(VALID)('accepts %s', (input, out) => expect(normalizePkPhone(input)).toBe(out));
  it.each(INVALID)('rejects "%s"', (input) => expect(normalizePkPhone(input)).toBeNull());
});

describe('City-based delivery', () => {
  const opts = [{ id: 'k', name: 'Karachi Delivery' }, { id: 'n', name: 'Nationwide Delivery' }];
  const ids = (c) => optionsForCity(opts, c).map((o) => o.id).join();
  it('shows the city option only for that city', () => { expect(ids('Karachi')).toBe('k'); expect(ids('karachi city')).toBe('k'); });
  it('falls back to general options for other cities', () => { expect(ids('Lahore')).toBe('n'); });
  it('shows everything before a city is typed', () => expect(ids('')).toBe('k,n'));
  it('never leaves the customer with no option', () => expect(optionsForCity([{ id: 'k', name: 'Karachi Delivery' }], 'Lahore')).toHaveLength(1));
  it('recognizes city-specific option names', () => {
    for (const city of PK_CITIES) expect(restrictedCity(`${city} Express`)).toBe(city);
  });
  it('gives a delivery estimate for any city', () => { expect(etaFor('Karachi')).toMatch(/working days/); expect(etaFor('Gilgit')).toBe(ETA_DEFAULT); });
});
