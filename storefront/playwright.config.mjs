import { defineConfig } from '@playwright/test';

// Needs the backend (with a few products) and the storefront running:  npm run dev   then   npm run test:e2e
export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: process.env.E2E_URL || 'http://localhost:3000' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
