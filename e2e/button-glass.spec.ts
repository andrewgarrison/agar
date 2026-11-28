import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import type { Measure } from './jelly';
import { boxOf, settledJelly } from './jelly';
import type { Pixel } from './screen';
import { contrast, luminance, middle, shot, spread } from './screen';

// How tall the jelly is: a squish flattens it.
const HEIGHT: Measure = { axis: 'y', of: 'extent' };

function button(page: Page, name: string): Locator {
  return page.getByRole('button', { name });
}

async function open(page: Page, theme: 'light' | 'dark' = 'light'): Promise<void> {
  await page.emulateMedia({ colorScheme: theme });
  await page.goto('/button');
  await expect(button(page, 'Publish')).toHaveAttribute('data-jelly', 'ready');
}

// Hides the labels' text, keeping their names, so a shot sees only the glass.
async function hideLabels(page: Page): Promise<void> {
  await page.addStyleTag({ content: '.agar-button-label { color: transparent; }' });
}

/** The glass behind a button's label, as seen on screen once the jelly settles. */
async function glassBehind(page: Page, name: string): Promise<Pixel[]> {
  await settledJelly(button(page, name), { solid: 30 });
  const image = await shot(page, button(page, name).locator('.agar-button-label'));
  return middle(image, 0, 1);
}

async function clipOf(root: Locator): Promise<string> {
  const clip = await root.locator('.agar-button-glass').evaluate((element) => getComputedStyle(element).clipPath);
  return clip;
}

/** The glass's clip while Space holds the button down. */
async function pressedClip(page: Page, root: Locator): Promise<string> {
  await root.focus();
  await page.keyboard.down('Space');
  await settledJelly(root, HEIGHT);
  const clip = await clipOf(root);
  await page.keyboard.up('Space');
  return clip;
}

async function textLuminance(page: Page, name: string): Promise<number> {
  const colour = await button(page, name).evaluate((element) => getComputedStyle(element).color);
  const channels = (colour.match(/[\d.]+/gu) ?? []).map(Number);
  return luminance(channels);
}

// A busy picture behind the first row of buttons, with stripes fine enough
// that the glass's light blur (2px) evens them out.
const STRIPES = '.demo .row:first-of-type { background: repeating-linear-gradient(115deg, #fff 0 2px, #c0f 2px 5px); }';

const LABELLED = ['Publish', 'Save draft', 'Save changes', 'Sync'];

/** The lowest contrast any button's label gets against the glass behind it. */
async function worstContrast(page: Page): Promise<number> {
  const text = await Promise.all(
    LABELLED.map(async (name) => {
      const level = await textLuminance(page, name);
      return level;
    }),
  );
  await hideLabels(page);
  const behind = await Promise.all(
    LABELLED.map(async (name) => {
      const pixels = await glassBehind(page, name);
      return pixels;
    }),
  );
  const worst = behind.map((pixels, index) =>
    Math.min(...pixels.map((pixel) => contrast(luminance(pixel), text[index] ?? 0))),
  );
  return Math.min(...worst);
}

/**
 * How much brighter the jelly's rim is at its left end than at its right, on
 * its middle row: the brightest light (colour times alpha) in each half.
 */
async function rimLean(root: Locator): Promise<number> {
  const lean = await root.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (ctx === null) {
      return 0;
    }
    const row = Math.floor(canvas.height / 2);
    const { data } = ctx.getImageData(0, row, canvas.width, 1);
    const light = (from: number, to: number): number => {
      let most = 0;
      for (let x = from; x < to; x += 1) {
        most = Math.max(most, (data[x * 4] ?? 0) * (data[x * 4 + 3] ?? 0));
      }
      return most;
    };
    const half = Math.floor(canvas.width / 2);
    return light(0, half) - light(half, canvas.width);
  });
  return lean;
}

test.describe('button glass', () => {
  test('follows the jelly as it squishes', async ({ page }) => {
    await open(page);
    const root = button(page, 'Publish');
    await settledJelly(root, HEIGHT);
    const rest = await clipOf(root);
    const pressed = await pressedClip(page, root);
    expect(rest).toMatch(/^path\(/u);
    expect(pressed).not.toBe(rest);
  });

  test('its rim light turns toward the cursor', async ({ page }) => {
    await open(page);
    const root = button(page, 'Publish');
    const box = await boxOf(root);
    // Beside the button, not over it, so the jelly's hover lean doesn't move it.
    const across = box.y + box.height / 2;
    await page.mouse.move(Math.max(1, box.x - 120), across);
    const lean = async (): Promise<number> => {
      const value = await rimLean(root);
      return value;
    };
    await expect.poll(lean).toBeGreaterThan(0);
    await page.mouse.move(box.x + box.width + 120, across, { steps: 4 });
    await expect.poll(lean).toBeLessThan(0);
  });

  test('blurs the picture behind it', async ({ page }) => {
    await open(page);
    await hideLabels(page);
    await page.addStyleTag({ content: STRIPES });
    const blurred = spread(await glassBehind(page, 'Save draft'));
    // The same glass, frosted but not blurred.
    await page.addStyleTag({
      content: '.agar-button-glass { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }',
    });
    const sharp = spread(await glassBehind(page, 'Save draft'));
    expect(blurred).toBeLessThan(sharp / 2);
  });

  test('labels keep 4.5:1 on the glass behind them, light', async ({ page }) => {
    await open(page, 'light');
    expect(await worstContrast(page)).toBeGreaterThanOrEqual(4.5);
  });

  test('labels keep 4.5:1 on the glass behind them, dark', async ({ page }) => {
    await open(page, 'dark');
    expect(await worstContrast(page)).toBeGreaterThanOrEqual(4.5);
  });
});
