import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import type { Measure } from './jelly';
import { patchContexts, settledJelly } from './jelly';

// Measures down the panel. The glass fades in, so count fainter pixels too.
const DOWN: Measure = { axis: 'y', solid: 24 };

function trigger(page: Page): Locator {
  return page.getByRole('button', { name: 'What is agar?' });
}

function panel(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Agar' });
}

function mint(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Mint' });
}

async function open(page: Page): Promise<void> {
  await page.goto('/popover');
  await expect(page.locator('.agar-popover').first()).toHaveAttribute('data-jelly', 'ready');
}

/** The jelly's colour at the middle of a panel's canvas, as [red, green, blue, alpha] bytes. */
async function middleColour(content: Locator): Promise<number[]> {
  const colour = await content.evaluate((element) => {
    const canvas = element.querySelector('canvas');
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      throw new Error('no jelly canvas');
    }
    return [...context.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data];
  });
  return colour;
}

/** How far apart two colours are, in the largest channel's bytes. */
function colourGap(from: readonly number[], to: readonly number[]): number {
  return Math.max(...to.map((channel, index) => Math.abs(channel - (from[index] ?? 0))));
}

test.describe('popover colours', () => {
  test('draws the default panel plain white in light mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page);
    await trigger(page).click();
    await settledJelly(panel(page), DOWN);
    // The middle of the panel, under its gradient's top half: white to a hair off it.
    const colour = await middleColour(panel(page));
    expect(colourGap(colour, [252, 252, 253, 255])).toBeLessThan(6);
  });

  test('--agar-jelly-tint recolours the jelly', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page);
    await page.getByRole('button', { name: 'Your colours' }).click();
    await settledJelly(mint(page), DOWN);
    // The docs set light-dark(rgb(214 245 230 / 0.96), rgb(18 66 52 / 0.96)).
    // The highlight lightens the middle a little.
    const colour = await middleColour(mint(page));
    expect(colourGap(colour, [214, 245, 230, 245])).toBeLessThan(10);
  });

  // Firefox doesn't restyle an open popover when the theme changes, so the
  // colour is read fresh each time it opens.
  test('--agar-jelly-tint follows data-theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page);
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'dark';
    });
    await page.getByRole('button', { name: 'Your colours' }).click();
    await settledJelly(mint(page), DOWN);
    const colour = await middleColour(mint(page));
    expect(colourGap(colour, [18, 66, 52, 245])).toBeLessThan(10);
    await expect(mint(page)).toHaveCSS('color', 'rgb(255, 255, 255)');
  });

  test('--agar-jelly-tint recolours the plain panel too', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await patchContexts(page, ['2d', 'webgl2', 'webgl']);
    await page.goto('/popover');
    await page.getByRole('button', { name: 'Your colours' }).click();
    await expect(mint(page)).toHaveCSS('background-color', 'rgba(214, 245, 230, 0.96)');
  });
});
