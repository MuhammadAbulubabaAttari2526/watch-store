import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const addItem = vi.fn(async () => ({}));
const push = vi.fn();
vi.mock('../components/CartProvider', () => ({ useCart: () => ({ addItem }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
import ProductPurchase from '../components/ProductPurchase.jsx';

const product = {
  title: 'Meridian', options: [{ id: 'os', title: 'Strap', values: ['Steel', 'Leather'] }, { id: 'od', title: 'Default', values: ['Default'] }],
  variants: [
    { id: 'v1', title: 'Steel', options: { os: 'Steel', od: 'Default' }, price: 48500, original: 48500, available: true, quantity: 3 },
    { id: 'v2', title: 'Leather', options: { os: 'Leather', od: 'Default' }, price: 36000, original: 45000, available: false, quantity: 0 },
  ],
};
beforeEach(() => { cleanup(); addItem.mockClear(); push.mockClear(); });
const setup = () => { const user = userEvent.setup(); render(<ProductPurchase product={product} whatsapp={null} />); return user; };

describe('ProductPurchase', () => {
  it('shows "From" the lowest price before a variant is chosen', () => {
    setup();
    expect(screen.getByText(/From/)).toBeTruthy();
    expect(screen.getByText(/36,000/)).toBeTruthy();
  });
  it('does not add to cart until every option is chosen', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Add to cart' }));
    expect(screen.getByRole('alert').textContent).toMatch(/Choose a strap/i);
    expect(addItem).not.toHaveBeenCalled();
  });
  it('hides options that only have one value', () => { setup(); expect(screen.queryByText('Default')).toBeNull(); });
  it('adds the chosen variant and quantity', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /^Steel/ }));
    await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
    await user.click(screen.getByRole('button', { name: 'Add to cart' }));
    expect(addItem).toHaveBeenCalledWith('v1', 2);
  });
  it('Buy now adds then goes to checkout', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /^Steel/ }));
    await user.click(screen.getByRole('button', { name: 'Buy now' }));
    expect(addItem).toHaveBeenCalledWith('v1', 1);
    expect(push).toHaveBeenCalledWith('/checkout');
  });
  it('blocks an out-of-stock variant', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /^Leather/ }));
    expect(screen.getByRole('status').textContent).toMatch(/Out of stock/);
    expect(screen.getByRole('button', { name: 'Add to cart' }).disabled).toBe(true);
    expect(addItem).not.toHaveBeenCalled();
  });
  it('shows the sale price and the original price for a chosen variant', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /^Steel/ }));
    expect(screen.getByText(/48,500/)).toBeTruthy();
  });
  it('cannot ask for more than the stock left', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /^Steel/ }));
    for (let i = 0; i < 6; i++) await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
    expect(screen.getByLabelText('Quantity', { selector: 'input' }).value).toBe('3');
  });
  it('shows an error and keeps working if the server refuses', async () => {
    addItem.mockRejectedValueOnce(new Error('Variant does not have the required inventory'));
    const user = setup();
    await user.click(screen.getByRole('button', { name: /^Steel/ }));
    await user.click(screen.getByRole('button', { name: 'Add to cart' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/inventory/);
  });
});
