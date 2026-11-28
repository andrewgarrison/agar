import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';
import type { Measure } from './jelly';
import {
  boxOf,
  gap,
  patchContexts,
  settledJelly,
  stillCanvas,
  supportsWebGL2,
  trackJelly,
  webGLContexts,
} from './jelly';
import { tab } from './keyboard';

// Glass jelly is faint: its body reads 36 to 60 alpha, far below the
// default cutoff (128), so count fainter pixels as jelly.
const GLASS = 30;
// How tall the jelly is: a squish flattens it.
const HEIGHT: Measure = { axis: 'y', of: 'extent', solid: GLASS };
// The rim's antialiasing and the top of the shadow pass the cutoff too, a
// row or two past the button.
const EDGE_ROWS = 3;

function publish(page: Page): Locator {
  return page.getByRole('button', { name: 'Publish' });
}

async function open(page: Page): Promise<Locator> {
  await page.goto('/button');
  await expect(publish(page)).toHaveAttribute('data-jelly', 'ready');
  return publish(page);
}

/** The lowest value on the path. */
function lowest(path: readonly (number | null)[]): number {
  return Math.min(...path.map(Number));
}

/** The highest value on the path. */
function highest(path: readonly (number | null)[]): number {
  return Math.max(...path.map(Number));
}

/**
 * The jelly's height at rest, with the cursor where a test leaves it, in the
 * page's corner: its rim light changes how many edge rows pass the cutoff, so
 * rest and after must share it. The light eases in, so wait for it first.
 */
async function restLitFromCorner(page: Page, root: Locator): Promise<number> {
  await page.mouse.move(0, 0);
  await stillCanvas(root);
  const rest = await settledJelly(root, HEIGHT);
  return rest;
}

/**
 * How far the jelly's centre moves over a second, a full breath, once a
 * press's squish has passed (the action stays pending for 1.5 s). Breathing
 * moves the edges by under a pixel, so measure the centre, which counts every
 * pixel (`settledJelly` calls under 0.05 px still).
 */
async function breathing(root: Locator): Promise<number> {
  await trackJelly(root, 20, HEIGHT);
  const path = await trackJelly(root, 60, { axis: 'y', solid: GLASS });
  return highest(path) - lowest(path);
}

test.describe('button', () => {
  test('has no accessibility violations', async ({ page }) => {
    await open(page);
    await expectNoA11yViolations(page);
  });

  test('Enter runs a slow action, which keeps focus while it is pending', async ({ page }) => {
    await open(page);
    const save = page.getByRole('button', { name: 'Save changes' });
    await save.focus();
    await page.keyboard.press('Enter');
    await expect(save).toHaveAttribute('aria-busy', 'true');
    await expect(save).toBeFocused();
    await expect(save).not.toHaveAttribute('aria-busy');
    await expect(save).toBeFocused();
  });

  test('Tab skips a disabled button and reaches one that stays focusable', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Sync' }).focus();
    await tab(page);
    const exportButton = page.getByRole('button', { name: 'Export' });
    await expect(exportButton).toBeFocused();
    await expect(exportButton).toHaveAttribute('aria-disabled', 'true');
    await expect(exportButton).toHaveAccessibleDescription('Add a row to export.');
  });
});

test.describe('button jelly', () => {
  test('the jelly fills the button', async ({ page }) => {
    const root = await open(page);
    const box = await boxOf(root);
    expect(gap(await settledJelly(root, HEIGHT), box.height)).toBeLessThan(EDGE_ROWS);
    expect(gap(await settledJelly(root, { solid: GLASS }), box.width / 2)).toBeLessThan(1);
  });

  test('pressing squishes the jelly, and letting go springs it back', async ({ page }) => {
    const root = await open(page);
    const rest = await restLitFromCorner(page, root);
    const box = await boxOf(root);
    // In the middle, where the hover lean pulls every side equally.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    const pressed = await trackJelly(root, 20, HEIGHT);
    await page.mouse.up();
    await page.mouse.move(0, 0);
    expect(lowest(pressed)).toBeLessThan(rest - 2);
    expect(gap(await settledJelly(root, HEIGHT), rest)).toBeLessThan(0.5);
  });

  test('holding Space squishes the jelly too', async ({ page }) => {
    const root = await open(page);
    const rest = await settledJelly(root, HEIGHT);
    await root.focus();
    await page.keyboard.down('Space');
    const pressed = await trackJelly(root, 20, HEIGHT);
    await page.keyboard.up('Space');
    expect(lowest(pressed)).toBeLessThan(rest - 2);
    expect(gap(await settledJelly(root, HEIGHT), rest)).toBeLessThan(0.5);
  });

  test('a disabled button does not squish', async ({ page }) => {
    await open(page);
    const root = page.getByRole('button', { name: 'Export' });
    const rest = await settledJelly(root, HEIGHT);
    await root.focus();
    await page.keyboard.down('Space');
    const pressed = await trackJelly(root, 20, HEIGHT);
    await page.keyboard.up('Space');
    // It measures the whole button, so the squish check below isn't measuring nothing.
    const box = await boxOf(root);
    expect(gap(rest, box.height)).toBeLessThan(EDGE_ROWS);
    expect(lowest(pressed)).toBeGreaterThan(rest - 0.5);
  });

  test('the jelly breathes while an action is pending, then settles', async ({ page }) => {
    await open(page);
    const save = page.getByRole('button', { name: 'Save changes' });
    const rest = await settledJelly(save, HEIGHT);
    await save.focus();
    await page.keyboard.press('Enter');
    await expect(save).toHaveAttribute('data-pending');
    expect(await breathing(save)).toBeGreaterThan(0.1);
    await expect(save).not.toHaveAttribute('data-pending');
    expect(gap(await settledJelly(save, HEIGHT), rest)).toBeLessThan(0.5);
  });

  test('every surface shares one WebGL context', async ({ page }) => {
    await patchContexts(page);
    const root = await open(page);
    await expect(page.locator('[data-jelly="ready"]')).toHaveCount(6);
    // The shared renderer makes its context on the first draw, not at mount.
    await settledJelly(root, { solid: GLASS });
    const made = await webGLContexts(page);
    // One shared context, or none where the browser has no WebGL2 (Canvas 2D draws instead).
    expect(made).toBe(Number(await supportsWebGL2(page)));
  });

  test('springs back without wobbling under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const root = await open(page);
    const rest = await settledJelly(root, HEIGHT);
    await root.focus();
    await page.keyboard.down('Space');
    expect(await settledJelly(root, HEIGHT)).toBeLessThan(rest - 2);
    await page.keyboard.up('Space');
    const path = await trackJelly(root, 60, HEIGHT);
    // Critically damped: it grows back to its height, never past it.
    expect(highest(path)).toBeLessThanOrEqual(rest + 0.5);
    expect(gap(await settledJelly(root, HEIGHT), rest)).toBeLessThan(0.5);
  });

  test('falls back to Canvas 2D without WebGL', async ({ page }) => {
    await patchContexts(page, ['webgl2', 'webgl']);
    const root = await open(page);
    const box = await boxOf(root);
    expect(gap(await settledJelly(root, HEIGHT), box.height)).toBeLessThan(EDGE_ROWS);
    expect(await webGLContexts(page)).toBe(0);
  });

  test('shows the plain fill when nothing can draw', async ({ page }) => {
    await patchContexts(page, ['2d', 'webgl2', 'webgl']);
    await page.goto('/button');
    const root = publish(page);
    await expect(root).toBeVisible();
    await expect(root).not.toHaveAttribute('data-jelly');
    await expect(root.locator('.agar-button-glass')).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  });

  test('matches the visual baseline @visual', async ({ page }, info) => {
    test.skip(info.project.name !== 'chromium', 'Visual baselines are Chromium-only for now.');
    test.skip(process.platform !== 'linux', 'Visual baselines are rendered on Linux in CI.');
    await open(page);
    const buttons = await page.locator('.agar-button').all();
    await Promise.all(
      buttons.map(async (root) => {
        await settledJelly(root, { solid: GLASS });
      }),
    );
    await expect(page.locator('section').first()).toHaveScreenshot('button-examples.png');
  });
});
