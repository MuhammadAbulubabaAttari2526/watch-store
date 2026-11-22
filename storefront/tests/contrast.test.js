import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Reads the real tokens.css so the test cannot drift from the design.
const css = fs.readFileSync(path.resolve(process.cwd(), 'styles/tokens.css'), 'utf8');
const block = (sel) => css.slice(css.indexOf(sel + ' {') + sel.length + 2, css.indexOf('\n}', css.indexOf(sel + ' {')));
const vars = (b) => Object.fromEntries([...b.matchAll(/--([\w-]+):\s*([^;]+?);/g)].map((m) => [m[1], m[2].trim().replace(/\s*\/\*.*$/, '')]));
const root = vars(block(':root')), dark = { ...root, ...vars(block('.theme-dark')) };
const resolve = (set, v) => { let x = set[v]; while (x && x.startsWith('var(')) x = set[x.slice(6, -1)]; return x; };
const lum = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const PAIRS = [
  ['text on page', 'text', 'bg'], ['muted text on page', 'text-muted', 'bg'], ['muted text on sunken surface', 'text-muted', 'surface-sunken'],
  ['gold text on page', 'accent-text', 'bg'], ['error on page', 'error', 'bg'], ['success on page', 'success', 'bg'], ['warning on page', 'warning', 'bg'],
  ['button text', 'brand-contrast', 'brand'], ['text on card surface', 'text', 'surface'],
];
describe('WCAG AA text contrast (4.5:1)', () => {
  for (const [theme, set] of [['light', root], ['dark', dark]]) {
    for (const [name, fg, bg] of PAIRS) {
      it(`${theme}: ${name}`, () => expect(ratio(resolve(set, fg), resolve(set, bg))).toBeGreaterThanOrEqual(4.5));
    }
  }
  it('obsidian text on gold buttons and badges', () => expect(ratio(root.obsidian, root.gold)).toBeGreaterThanOrEqual(4.5));
  it('ivory text on the obsidian announcement bar', () => expect(ratio(root.ivory, root.obsidian)).toBeGreaterThanOrEqual(4.5));
  it('focus ring is visible on the page (3:1)', () => { expect(ratio(root.focus, root.ivory)).toBeGreaterThanOrEqual(3); expect(ratio(dark.focus, dark.obsidian)).toBeGreaterThanOrEqual(3); });
});
