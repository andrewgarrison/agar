import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';
import type { Measure } from './jelly';
import { boxOf, isMonotonic, patchContexts, settledJelly, supportsWebGL2, trackJelly, webGLContexts } from './jelly';
import { tab } from './keyboard';

// Measures down the panel. The glass fades in, so count fainter pixels too.
const DOWN: Measure = { axis: 'y', solid: 24 };
// The stylesheet holds a closing panel this long while the jelly shrinks.
const EXIT_MS = 360;

function trigger(page: Page): Locator {
  return page.getByRole('button', { name: 'What is agar?' });
}

function panel(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Agar' });
}

async function open(page: Page): Promise<void> {
  await page.goto('/popover');
  await expect(page.locator('.agar-popover').first()).toHaveAttribute('data-jelly', 'ready');
}

/** The trigger's centre, in CSS px down from the panel's top edge. */
async function triggerCentre(page: Page): Promise<number> {
  const [from, box] = [await boxOf(trigger(page)), await boxOf(panel(page))];
  return from.y + from.height / 2 - box.y;
}

/** How far the settled jelly's centre is from the panel's middle, in px. */
async function offCentre(page: Page): Promise<number> {
  const rest = await settledJelly(panel(page), DOWN);
  const box = await boxOf(panel(page));
  return Math.abs(rest - box.height / 2);
}

/** The frames where something was drawn. */
function drawn(path: readonly (number | null)[]): number[] {
  return path.filter((each) => each !== null);
}

/** Opens the popover in the same task that starts sampling, so the first frame is caught. */
async function openAndTrack(page: Page, frames: number): Promise<number[]> {
  const press = await trigger(page).elementHandle();
  // The panel is hidden until it opens, so find it by class, not role.
  const closed = page.locator('.agar-popover').filter({ hasText: 'A seaweed gelatin' });
  return drawn(await trackJelly(closed, frames, { ...DOWN, press }));
}

/** Closes with Escape, then reopens in the same task the exit ends in. */
async function reopenAsItCloses(page: Page): Promise<void> {
  const opener = await trigger(page).elementHandle();
  await panel(page).evaluate((content, button) => {
    const observer = new MutationObserver(() => {
      if (!Object.hasOwn(content.dataset, 'endingStyle')) {
        observer.disconnect();
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });
    observer.observe(content, { attributes: true, attributeFilter: ['data-ending-style'] });
    content.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  }, opener);
}

/** Closes with the Done button, and returns how long the panel stayed on the page after. */
async function closeAndTime(page: Page): Promise<number> {
  const elapsed = await panel(page).evaluate(async (content) => {
    const done = [...content.querySelectorAll('button')].find((button) => button.textContent === 'Done');
    const started = performance.now();
    done?.click();
    const wait = async (): Promise<number> => {
      if (content.hasAttribute('hidden')) {
        return performance.now() - started;
      }
      const { promise, resolve } = Promise.withResolvers<number>();
      requestAnimationFrame(resolve);
      await promise;
      return wait();
    };
    const shown = await wait();
    return shown;
  });
  return elapsed;
}

test.describe('popover', () => {
  test('has no accessibility violations, closed or open', async ({ page }) => {
    await open(page);
    await expectNoA11yViolations(page);
    await trigger(page).click();
    await expect(panel(page)).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('opens from the keyboard and moves focus in', async ({ page }) => {
    await open(page);
    await page.getByRole('link', { name: 'Agar' }).focus();
    await tab(page);
    await expect(trigger(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(panel(page)).toBeVisible();
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(panel(page).getByRole('button', { name: 'Done' })).toBeFocused();
  });

  test('Escape closes it and returns focus to the trigger', async ({ page }) => {
    await open(page);
    await trigger(page).focus();
    await page.keyboard.press('Space');
    await expect(panel(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel(page)).toBeHidden();
    await expect(trigger(page)).toBeFocused();
  });

  test('focuses the first field, and keeps what was typed', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Rename' }).click();
    const name = page.getByRole('textbox', { name: 'Name' });
    await expect(name).toBeFocused();
    await name.fill('Tint');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Rename' }).click();
    await expect(name).toHaveValue('Tint');
  });

  test('an outside press closes it', async ({ page }) => {
    await open(page);
    await trigger(page).click();
    await expect(panel(page)).toBeVisible();
    await page.getByRole('heading', { name: 'Popover', level: 1 }).click();
    await expect(panel(page)).toBeHidden();
  });

  test('opens above when asked', async ({ page }) => {
    await open(page);
    const opener = page.getByRole('button', { name: 'Opens above' });
    await opener.click();
    const above = page.getByRole('dialog', { name: 'Placement' });
    await expect(above).toHaveAttribute('data-side', 'top');
    const [panelBox, openerBox] = [await boxOf(above), await boxOf(opener)];
    expect(panelBox.y).toBeLessThan(openerBox.y);
  });
});

test.describe('popover jelly', () => {
  test('grows out of the trigger and settles on the panel', async ({ page }) => {
    await open(page);
    const [first = Number.NaN] = await openAndTrack(page, 20);
    // It settles in the middle of the panel...
    expect(await offCentre(page)).toBeLessThan(3);
    // ...having started at least halfway toward the trigger.
    const [rest, from] = [await settledJelly(panel(page), DOWN), await triggerCentre(page)];
    expect(first).toBeLessThan(rest - (rest - from) / 2);
  });

  test('keeps the panel up while the jelly shrinks back, then returns focus', async ({ page }) => {
    await open(page);
    await trigger(page).click();
    await settledJelly(panel(page), DOWN);
    const shown = await closeAndTime(page);
    expect(shown).toBeGreaterThanOrEqual(EXIT_MS - 20);
    expect(shown).toBeLessThan(EXIT_MS + 400);
    await expect(trigger(page)).toBeFocused();
  });

  // Reopening just as the close finishes hid and showed the canvas between two
  // intersection reports, and the stage read the older one: off screen, so
  // it never drew again.
  test('reopening as it finishes closing grows it again', async ({ page }) => {
    await open(page);
    await trigger(page).click();
    await settledJelly(panel(page), DOWN);
    await reopenAsItCloses(page);
    await expect(panel(page)).toBeVisible();
    expect(await offCentre(page)).toBeLessThan(3);
  });

  test('every surface shares one WebGL context', async ({ page }) => {
    await patchContexts(page);
    await open(page);
    await expect(page.locator('[data-jelly="ready"]')).toHaveCount(4);
    // The shared renderer makes its context on the first draw, not at mount.
    await trigger(page).click();
    await settledJelly(panel(page), DOWN);
    const made = await webGLContexts(page);
    expect(made).toBe(Number(await supportsWebGL2(page)));
  });

  test('grows without wobbling, and closes at once, under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    const path = await openAndTrack(page, 60);
    const box = await boxOf(panel(page));
    // Critically damped: it only ever moves down from the trigger, never past the middle.
    expect(isMonotonic(path, 0.5)).toBe(true);
    expect(Math.max(...path)).toBeLessThanOrEqual(box.height / 2 + 1);
    expect(await closeAndTime(page)).toBeLessThan(EXIT_MS / 2);
  });

  test('falls back to Canvas 2D without WebGL', async ({ page }) => {
    await patchContexts(page, ['webgl2', 'webgl']);
    await open(page);
    await trigger(page).click();
    expect(await offCentre(page)).toBeLessThan(3);
    expect(await webGLContexts(page)).toBe(0);
  });

  test('shows a plain panel when nothing can draw', async ({ page }) => {
    await patchContexts(page, ['2d', 'webgl2', 'webgl']);
    await page.goto('/popover');
    await trigger(page).click();
    await expect(panel(page)).toBeVisible();
    await expect(panel(page)).not.toHaveAttribute('data-jelly');
    await expect(panel(page)).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await page.keyboard.press('Escape');
    await expect(panel(page)).toBeHidden();
    await expect(trigger(page)).toBeFocused();
  });

  test('matches the visual baseline @visual', async ({ page }, info) => {
    test.skip(info.project.name !== 'chromium', 'Visual baselines are Chromium-only for now.');
    test.skip(process.platform !== 'linux', 'Visual baselines are rendered on Linux in CI.');
    await open(page);
    await trigger(page).click();
    await settledJelly(panel(page), DOWN);
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('popover-open.png');
  });
});
