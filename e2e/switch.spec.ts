import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';
import {
  boxOf,
  furthest,
  gap,
  isMonotonic,
  patchContexts,
  settledJelly,
  supportsWebGL2,
  thumbCentre,
  trackJelly,
  webGLContexts,
} from './jelly';
import { tab } from './keyboard';

function airplane(page: Page): Locator {
  return page.getByRole('switch', { name: 'Airplane mode' });
}

async function open(page: Page): Promise<Locator> {
  await page.goto('/switch');
  await expect(airplane(page)).toHaveAttribute('data-jelly', 'ready');
  return airplane(page);
}

// Presses the switch's off end and drags off it before letting go.
async function pressAndDragOff(page: Page, root: Locator): Promise<(number | null)[]> {
  const box = await boxOf(root);
  await page.mouse.move(box.x + box.width / 4, box.y + box.height / 2);
  await page.mouse.down();
  const path = await trackJelly(root, 20);
  await page.mouse.move(box.x + box.width / 4, box.y + box.height * 4);
  await page.mouse.up();
  return path;
}

test.describe('switch', () => {
  test('has no accessibility violations', async ({ page }) => {
    await open(page);
    await expectNoA11yViolations(page);
  });

  test('Space toggles it and Enter never does', async ({ page }) => {
    const root = await open(page);
    await tab(page);
    await tab(page);
    await expect(root).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(root).toHaveAttribute('aria-checked', 'false');
    await page.keyboard.press('Space');
    await expect(root).toHaveAttribute('aria-checked', 'true');
  });

  test('Tab skips a disabled switch and reaches a read-only one, which stays put', async ({ page }) => {
    const root = await open(page);
    await root.focus();
    await tab(page);
    await expect(page.getByRole('switch', { name: 'Wi-Fi' })).toBeFocused();
    await tab(page);
    const readOnly = page.getByRole('switch', { name: /Encrypt backups/u });
    await expect(readOnly).toBeFocused();
    await page.keyboard.press('Space');
    await expect(readOnly).toHaveAttribute('aria-checked', 'true');
  });

  test('the jelly follows the state', async ({ page }) => {
    const root = await open(page);
    expect(gap(await settledJelly(root), await thumbCentre(root))).toBeLessThan(1);
    await root.click();
    await expect(root).toHaveAttribute('aria-checked', 'true');
    const on = await settledJelly(root);
    expect(gap(on, await thumbCentre(root))).toBeLessThan(1);
    const box = await boxOf(root);
    expect(on).toBeGreaterThan(box.width / 2);
  });

  test('pressing tugs the jelly, and letting go off the switch springs it back', async ({ page }) => {
    const root = await open(page);
    const rest = await settledJelly(root);
    const path = await pressAndDragOff(page, root);
    expect(furthest(path)).toBeGreaterThan(rest + 2);
    await expect(root).toHaveAttribute('aria-checked', 'false');
    expect(gap(await settledJelly(root), rest)).toBeLessThan(1);
  });

  test('every surface shares one WebGL context', async ({ page }) => {
    await patchContexts(page);
    const root = await open(page);
    await expect(page.locator('[data-jelly="ready"]')).toHaveCount(4);
    // The shared renderer makes its context on the first draw, not at mount.
    await settledJelly(root);
    const made = await webGLContexts(page);
    // One shared context, or none where the browser has no WebGL2 (Canvas 2D draws instead).
    expect(made).toBe(Number(await supportsWebGL2(page)));
  });

  test('moves without wobbling under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const root = await open(page);
    await settledJelly(root);
    await root.click();
    const path = await trackJelly(root, 90);
    const end = await thumbCentre(root);
    // Critically damped: it only ever moves toward the end, never past it.
    expect(isMonotonic(path, 0.5)).toBe(true);
    expect(furthest(path)).toBeLessThanOrEqual(end + 0.5);
    expect(gap(await settledJelly(root), end)).toBeLessThan(1);
  });

  test('falls back to Canvas 2D without WebGL', async ({ page }) => {
    await patchContexts(page, ['webgl2', 'webgl']);
    const root = await open(page);
    await root.click();
    expect(gap(await settledJelly(root), await thumbCentre(root))).toBeLessThan(1);
    expect(await webGLContexts(page)).toBe(0);
  });

  test('shows the CSS thumb when nothing can draw', async ({ page }) => {
    await patchContexts(page, ['2d', 'webgl2', 'webgl']);
    await page.goto('/switch');
    const root = airplane(page);
    await root.click();
    await expect(root).toHaveAttribute('aria-checked', 'true');
    await expect(root).not.toHaveAttribute('data-jelly');
    await expect(root.locator('.agar-switch-thumb')).toHaveCSS('opacity', '1');
  });

  test('matches the visual baseline @visual', async ({ page }, info) => {
    test.skip(info.project.name !== 'chromium', 'Visual baselines are Chromium-only for now.');
    test.skip(process.platform !== 'linux', 'Visual baselines are rendered on Linux in CI.');
    await open(page);
    const switches = await page.getByRole('switch').all();
    await Promise.all(
      switches.map(async (root) => {
        await settledJelly(root);
      }),
    );
    await expect(page.locator('section').first()).toHaveScreenshot('switch-examples.png');
  });
});
