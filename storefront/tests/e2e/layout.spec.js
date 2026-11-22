import { expect, test } from '@playwright/test';

// First time only:  npx playwright install chromium
const WIDTHS = [[360, 740, 'small phone'], [390, 844, 'iPhone'], [768, 1024, 'tablet'], [1280, 800, 'laptop'], [1920, 1080, 'desktop']];
const PAGES = ['/', '/products', '/cart', '/checkout', '/account/login', '/account/register', '/account/forgot-password'];

for (const [w, h, label] of WIDTHS) {
  for (const path of PAGES) {
    test(`${label} (${w}px): ${path} has no sideways scrolling`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
}

test('mobile menu opens, and the cart drawer opens and closes with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await page.getByRole('button', { name: 'Close menu' }).click();
  await page.getByRole('button', { name: /^Cart/ }).click();
  await expect(page.getByRole('dialog', { name: 'Shopping cart' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Shopping cart' })).toBeHidden();
});

test('a bad phone number blocks checkout on the page', async ({ page }) => {
  await page.goto('/products');
  const first = page.locator('.product-card__link').first();
  test.skip((await first.count()) === 0, 'no products in the store yet');
  await first.click();
  const strap = page.locator('.opt__btn').first();
  if (await strap.count()) await strap.click();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.goto('/checkout');
  await page.getByLabel('Full name').fill('Test User');
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Phone number').fill('0300123');
  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page.getByText(/Pakistani number/)).toBeVisible();
});
