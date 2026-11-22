import type { Page } from '@playwright/test';

/**
 * Moves focus to the next focusable element, as a keyboard user would.
 * WebKit follows Safari's default, where Tab skips buttons and links and
 * Option+Tab reaches everything, so use Alt+Tab there.
 */
export async function tab(page: Page, { shift = false } = {}): Promise<void> {
  const isWebKit = page.context().browser()?.browserType().name() === 'webkit';
  const key = `${isWebKit ? 'Alt+' : ''}${shift ? 'Shift+' : ''}Tab`;
  await page.keyboard.press(key);
}
