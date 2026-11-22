import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';
import type { Measure } from './jelly';
import {
  boxOf,
  furthest,
  gap,
  isMonotonic,
  patchContexts,
  settledJelly,
  supportsWebGL2,
  trackJelly,
  webGLContexts,
} from './jelly';
import { tab } from './keyboard';

function topics(page: Page): Locator {
  return page.getByRole('tablist', { name: 'Agar topics' });
}

async function open(page: Page): Promise<Locator> {
  await page.goto('/tabs');
  await expect(topics(page)).toHaveAttribute('data-jelly', 'ready');
  return topics(page);
}

// The tint jelly is translucent, so fainter pixels count as jelly.
const TINT: Measure = { solid: 24 };
const TINT_DOWN: Measure = { ...TINT, axis: 'y' };

/** The centre of a tab, in CSS px from its list's left edge (or top edge, for `y`). */
async function tabCentre(list: Locator, name: string, axis: Measure['axis'] = 'x'): Promise<number> {
  const centre = await list
    .getByRole('tab', { name })
    .evaluate(
      (element: HTMLElement, down) =>
        down ? element.offsetTop + element.offsetHeight / 2 : element.offsetLeft + element.offsetWidth / 2,
      axis === 'y',
    );
  return centre;
}

/** How tall the solid part of the drawn jelly is, in CSS px. */
async function jellyHeight(list: Locator): Promise<number> {
  const height = await list.evaluate((element) => {
    const canvas = element.querySelector('canvas');
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      throw new Error('no jelly canvas');
    }
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const rows = new Set<number>();
    for (let index = 3; index < data.length; index += 4) {
      if ((data[index] ?? 0) > 128) {
        rows.add(Math.floor((index - 3) / 4 / canvas.width));
      }
    }
    return rows.size / (canvas.height / canvas.clientHeight);
  });
  return height;
}

/** How wide the jelly is drawn, in CSS px, once per frame for `frames` frames. */
async function trackWidths(list: Locator, frames: number): Promise<number[]> {
  const widths = await list.evaluate(async (element, count) => {
    const canvas = element.querySelector('canvas');
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      throw new Error('no jelly canvas');
    }
    const width = (): number => {
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      const columns = new Set<number>();
      for (let index = 3; index < data.length; index += 4) {
        if ((data[index] ?? 0) > 24) {
          columns.add(((index - 3) / 4) % canvas.width);
        }
      }
      return columns.size / (canvas.width / canvas.clientWidth);
    };
    const sample = async (left: number): Promise<number[]> => {
      if (left === 0) {
        return [];
      }
      const { promise, resolve } = Promise.withResolvers<number>();
      requestAnimationFrame(resolve);
      await promise;
      const here = width();
      return [here, ...(await sample(left - 1))];
    };
    const path = await sample(count);
    return path;
  }, frames);
  return widths;
}

/**
 * How far the jelly's measured centre sits from a tab's centre once settled.
 * The tint's highlight skews it by about a pixel, the same wherever it rests,
 * so tests compare offsets rather than positions.
 */
async function offsetFrom(list: Locator, name: string, measure: Measure = TINT): Promise<number> {
  return (await settledJelly(list, measure)) - (await tabCentre(list, name, measure.axis));
}

// Clicks a tab, then moves the mouse away so the hover doesn't pull the jelly
// toward it.
async function select(page: Page, list: Locator, name: string): Promise<void> {
  await list.getByRole('tab', { name }).click();
  await page.mouse.move(0, 0);
}

// Presses a tab and drags off it before letting go. Returns the jelly's path
// while pressed.
async function pressAndDragOff(page: Page, list: Locator, name: string): Promise<(number | null)[]> {
  const box = await boxOf(list.getByRole('tab', { name }));
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const path = await trackJelly(list, 20, TINT);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 5);
  await page.mouse.up();
  return path;
}

test.describe('tabs', () => {
  test('has no accessibility violations', async ({ page }) => {
    await open(page);
    await expectNoA11yViolations(page);
  });

  test('Tab reaches the selected tab, then moves on to its panel', async ({ page }) => {
    const list = await open(page);
    await page.getByRole('link', { name: 'Agar' }).focus();
    await tab(page);
    await expect(list.getByRole('tab', { name: 'Tokens' })).toBeFocused();
    await tab(page);
    await expect(page.getByRole('tabpanel', { name: 'Tokens' })).toBeFocused();
  });

  test('arrow keys, Home and End select, wrapping at the ends', async ({ page }) => {
    const list = await open(page);
    await list.getByRole('tab', { name: 'Tokens' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(list.getByRole('tab', { name: 'Motion' })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('End');
    await expect(list.getByRole('tab', { name: 'Perf' })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(list.getByRole('tab', { name: 'Tokens' })).toBeFocused();
    await page.keyboard.press('Home');
    await expect(list.getByRole('tab', { name: 'Tokens' })).toHaveAttribute('aria-selected', 'true');
  });

  test('arrow keys reach a disabled tab but never select it', async ({ page }) => {
    await open(page);
    const plans = page.getByRole('tablist', { name: 'Billing plans' });
    await plans.getByRole('tab', { name: 'Yearly' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(plans.getByRole('tab', { name: /Team/u })).toBeFocused();
    await expect(plans.getByRole('tab', { name: 'Yearly' })).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('tabs jelly', () => {
  test('the jelly follows the selection', async ({ page }) => {
    const list = await open(page);
    const rest = await offsetFrom(list, 'Tokens');
    expect(Math.abs(rest)).toBeLessThan(2);
    await select(page, list, 'Access');
    await expect(list.getByRole('tab', { name: 'Access' })).toHaveAttribute('aria-selected', 'true');
    expect(gap(await offsetFrom(list, 'Access'), rest)).toBeLessThan(1);
  });

  test('pressing another tab tugs the jelly, and letting go off it springs back', async ({ page }) => {
    const list = await open(page);
    const rest = await settledJelly(list, TINT);
    const path = await pressAndDragOff(page, list, 'Perf');
    expect(furthest(path)).toBeGreaterThan(rest + 2);
    await expect(list.getByRole('tab', { name: 'Tokens' })).toHaveAttribute('aria-selected', 'true');
    expect(gap(await settledJelly(list, TINT), rest)).toBeLessThan(1);
  });

  // UI SDK writes the indicator twice per change. A second move to the same
  // box used to restart the move as rightward, so every leftward move
  // squeezed the jelly thin halfway across.
  test('moving left stretches the jelly rather than squeezing it', async ({ page }) => {
    const list = await open(page);
    await select(page, list, 'Perf');
    await settledJelly(list, TINT);
    const [rest = 0] = await trackWidths(list, 1);
    await list.getByRole('tab', { name: 'Tokens' }).click();
    const widths = await trackWidths(list, 30);
    // Landing squashes it to about 85% of its resting width; the bug left about 35%.
    expect(Math.min(...widths)).toBeGreaterThan(rest * 0.6);
  });

  test('a vertical list moves the jelly down, at full height', async ({ page }) => {
    await open(page);
    const list = page.getByRole('tablist', { name: 'Settings' });
    const [rest, height] = [await offsetFrom(list, 'Profile', TINT_DOWN), await jellyHeight(list)];
    await select(page, list, 'Privacy');
    expect(gap(await offsetFrom(list, 'Privacy', TINT_DOWN), rest)).toBeLessThan(1);
    // Pressing squishes the jelly. Once it lands, the squish lets go.
    expect(gap(await jellyHeight(list), height)).toBeLessThan(1.5);
  });

  test('every surface shares one WebGL context', async ({ page }) => {
    await patchContexts(page);
    const list = await open(page);
    await expect(page.locator('[data-jelly="ready"]')).toHaveCount(3);
    // The shared renderer makes its context on the first draw, not at mount.
    await settledJelly(list, TINT);
    const made = await webGLContexts(page);
    // One shared context, or none where the browser has no WebGL2 (Canvas 2D draws instead).
    expect(made).toBe(Number(await supportsWebGL2(page)));
  });

  test('moves without wobbling under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const list = await open(page);
    const rest = await offsetFrom(list, 'Tokens');
    await list.getByRole('tab', { name: 'Tokens' }).focus();
    await page.keyboard.press('End');
    const path = await trackJelly(list, 90, TINT);
    const end = (await tabCentre(list, 'Perf')) + rest;
    // Critically damped: it only ever moves toward the end, never past it.
    expect(isMonotonic(path, 0.5)).toBe(true);
    expect(furthest(path)).toBeLessThanOrEqual(end + 0.5);
    expect(gap(await settledJelly(list, TINT), end)).toBeLessThan(1);
  });

  test('falls back to Canvas 2D without WebGL', async ({ page }) => {
    await patchContexts(page, ['webgl2', 'webgl']);
    const list = await open(page);
    const rest = await offsetFrom(list, 'Tokens');
    await select(page, list, 'Motion');
    expect(gap(await offsetFrom(list, 'Motion'), rest)).toBeLessThan(1);
    expect(await webGLContexts(page)).toBe(0);
  });

  test('shows the CSS indicator when nothing can draw', async ({ page }) => {
    await patchContexts(page, ['2d', 'webgl2', 'webgl']);
    await page.goto('/tabs');
    const list = topics(page);
    await list.getByRole('tab', { name: 'Motion' }).click();
    await expect(list.getByRole('tab', { name: 'Motion' })).toHaveAttribute('aria-selected', 'true');
    await expect(list).not.toHaveAttribute('data-jelly');
    await expect(list.locator('.agar-tabs-indicator')).toHaveCSS('opacity', '1');
  });

  test('matches the visual baseline @visual', async ({ page }, info) => {
    test.skip(info.project.name !== 'chromium', 'Visual baselines are Chromium-only for now.');
    test.skip(process.platform !== 'linux', 'Visual baselines are rendered on Linux in CI.');
    await open(page);
    const lists = await page.getByRole('tablist').all();
    await Promise.all(
      lists.map(async (list) => {
        await settledJelly(list, TINT);
      }),
    );
    await expect(page.locator('section').first()).toHaveScreenshot('tabs-examples.png');
  });
});
