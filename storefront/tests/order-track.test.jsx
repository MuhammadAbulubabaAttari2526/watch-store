import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import OrderTrack from '../components/account/OrderTrack.jsx';

const doneCount = (o) => { const { container, unmount } = render(<OrderTrack order={o} />); const n = container.querySelectorAll('li.is-done').length; unmount(); return n; };

describe('Order tracking steps', () => {
  it('maps fulfilment status to progress', () => {
    expect(doneCount({ status: 'pending', fulfillment_status: 'not_fulfilled' })).toBe(1);
    expect(doneCount({ status: 'pending', fulfillment_status: 'fulfilled' })).toBe(2);
    expect(doneCount({ status: 'pending', fulfillment_status: 'shipped' })).toBe(3);
    expect(doneCount({ status: 'completed', fulfillment_status: 'delivered' })).toBe(4);
  });
  it('defaults to "placed" when no status is available', () => expect(doneCount({})).toBe(1));
  it('shows cancelled orders as cancelled', () => {
    const { container } = render(<OrderTrack order={{ status: 'canceled', fulfillment_status: 'shipped' }} />);
    expect(container.textContent).toMatch(/cancelled/i);
    expect(container.querySelectorAll('li').length).toBe(0);
  });
});
