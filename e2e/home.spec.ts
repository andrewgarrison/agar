import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';
import { tab } from './keyboard';

test.describe('docs home', () => {
  test('has no accessibility violations', async ({ page }) => {
    await page.goto('/');
    await expectNoA11yViolations(page);
  });

  test('icon button is named by VisuallyHidden', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Star Agar' })).toBeVisible();
  });

  test('keyboard reaches the button', async ({ page }) => {
    await page.goto('/');
    await tab(page);
    await expect(page.getByRole('button', { name: 'Star Agar' })).toBeFocused();
  });

  test('matches the visual baseline @visual', async ({ page }, info) => {
    test.skip(info.project.name !== 'chromium', 'Visual baselines are Chromium-only for now.');
    test.skip(process.platform !== 'linux', 'Visual baselines are rendered on Linux in CI.');
    await page.goto('/');
    await expect(page).toHaveScreenshot('home.png', { fullPage: true });
  });
});
