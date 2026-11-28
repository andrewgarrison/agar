// Reads jelly back from the canvas, so e2e tests check what the renderer and
// stage actually drew, not just the DOM.
import type { ElementHandle, Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Measure {
  /** Which way to measure the centre: across (`x`, the default) or down (`y`). */
  readonly axis?: 'x' | 'y';
  /**
   * The alpha, 0 to 255, above which a pixel counts as jelly, not shadow.
   * Defaults to 128, for solid materials like milk; translucent tint needs less.
   */
  readonly solid?: number;
  /**
   * Clicks this element in the same task that starts sampling, so the first
   * frame after the click is caught. A Playwright click returns a varying
   * number of frames later.
   */
  readonly press?: ElementHandle | null;
  /**
   * What to read: the jelly's `centre` (the default), or its `extent`, how far
   * it reaches along the axis in CSS px, which a squish changes.
   */
  readonly of?: 'centre' | 'extent';
}

/**
 * Where the jelly is drawn on a component's canvas, once per frame for
 * `frames` frames: its centre in CSS px from the component's left edge (or
 * top edge, for `y`), or its extent, or null while nothing is drawn. Only
 * solid pixels count, so the shadow doesn't pull the centre sideways.
 */
export async function trackJelly(
  root: Locator,
  frames: number,
  { axis = 'x', solid = 128, press = null, of = 'centre' }: Measure = {},
): Promise<(number | null)[]> {
  const samples = await root.evaluate(
    async (element, { count, down, cutoff, button, extent }) => {
      const canvas = element.querySelector('canvas');
      const context = canvas?.getContext('2d');
      if (!canvas || !context) {
        throw new Error('no jelly canvas');
      }
      const centre = (): number | null => {
        // The solid pixels' weighted position and their first and last row (or
        // column), in canvas px.
        const scan = (): { sum: number; weight: number; first: number; last: number } => {
          const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
          const found = { sum: 0, weight: 0, first: Number.POSITIVE_INFINITY, last: Number.NEGATIVE_INFINITY };
          for (let index = 3; index < data.length; index += 4) {
            const alpha = data[index] ?? 0;
            const pixel = (index - 3) / 4;
            const at = down ? Math.floor(pixel / canvas.width) : pixel % canvas.width;
            if (alpha > cutoff) {
              Object.assign(found, {
                sum: found.sum + at * alpha,
                weight: found.weight + alpha,
                first: Math.min(found.first, at),
                last: Math.max(found.last, at),
              });
            }
          }
          return found;
        };
        const { sum, weight, first, last } = scan();
        const scale = canvas.width / canvas.clientWidth;
        if (weight === 0) {
          return null;
        }
        return extent
          ? (last - first + 1) / scale
          : sum / weight / scale + (down ? canvas.offsetTop : canvas.offsetLeft);
      };
      const sample = async (left: number): Promise<(number | null)[]> => {
        if (left === 0) {
          return [];
        }
        const { promise, resolve } = Promise.withResolvers<number>();
        requestAnimationFrame(resolve);
        await promise;
        const here = centre();
        const rest = await sample(left - 1);
        return [here, ...rest];
      };
      if (button instanceof HTMLElement) {
        button.click();
      }
      const path = await sample(count);
      return path;
    },
    { count: frames, down: axis === 'y', cutoff: solid, button: press, extent: of === 'extent' },
  );
  return samples;
}

// How far apart the samples are, or Infinity when any is missing.
function spread(samples: readonly (number | null)[]): number {
  const xs = samples.filter((each) => each !== null);
  return xs.length < samples.length ? Number.POSITIVE_INFINITY : Math.max(...xs) - Math.min(...xs);
}

/**
 * Waits until nothing on the component's canvas changes over 10 frames: the
 * jelly has stopped and so has its light (a lens's rim light eases toward the
 * cursor over about a second, which `settledJelly` can't see between rows).
 */
export async function stillCanvas(root: Locator): Promise<void> {
  const still = async (): Promise<boolean> => {
    const same = await root.evaluate(async (element) => {
      const canvas = element.querySelector('canvas');
      const context = canvas?.getContext('2d');
      if (!canvas || !context) {
        throw new Error('no jelly canvas');
      }
      const pixels = (): string => context.getImageData(0, 0, canvas.width, canvas.height).data.join(',');
      // The pixels `left` frames from now.
      const after = async (left: number): Promise<string> => {
        if (left === 0) {
          return pixels();
        }
        const { promise, resolve } = Promise.withResolvers<number>();
        requestAnimationFrame(resolve);
        await promise;
        const later = await after(left - 1);
        return later;
      };
      const before = pixels();
      const later = await after(10);
      return later === before;
    });
    return same;
  };
  await expect.poll(still).toBe(true);
}

/** Waits for the jelly to stop moving, and returns where its centre (or extent) came to rest. */
export async function settledJelly(root: Locator, measure: Measure = {}): Promise<number> {
  const resting: number[] = [];
  await expect
    .poll(async () => {
      const samples = await trackJelly(root, 10, measure);
      resting.unshift(Number(samples.at(-1)));
      return spread(samples);
    })
    .toBeLessThan(0.05);
  return resting[0] ?? Number.NaN;
}

/** True when the path only ever moves one way (rightward), give or take `slack` px. */
export function isMonotonic(path: readonly (number | null)[], slack: number): boolean {
  const xs = path.map(Number);
  return xs.every((x, index) => index === 0 || x >= (xs[index - 1] ?? x) - slack);
}

/** How far apart two positions are, in px. Positions within 1px count as the same place. */
export function gap(from: number, to: number): number {
  return Math.abs(from - to);
}

/** The largest x on the path. */
export function furthest(path: readonly (number | null)[]): number {
  return Math.max(...path.map(Number));
}

/** The centre of the real (CSS) thumb, in CSS px from the component's left edge. */
export async function thumbCentre(root: Locator): Promise<number> {
  const centre = await root
    .locator('.agar-switch-thumb')
    .evaluate((thumb: HTMLElement) => thumb.offsetLeft + thumb.offsetWidth / 2);
  return centre;
}

/** The element's box on the page; fails when it isn't rendered. */
export async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error('not rendered');
  }
  return box;
}

/**
 * Wraps every canvas's getContext before the page's own scripts run: it
 * refuses the `refused` kinds, and counts the WebGL2 contexts it hands out in
 * `globalThis.agarWebGLContexts`.
 */
export async function patchContexts(page: Page, refused: readonly string[] = []): Promise<void> {
  await page.addInitScript((kinds: readonly string[]) => {
    const { prototype } = HTMLCanvasElement;
    const original: unknown = Reflect.get(prototype, 'getContext');
    if (typeof original !== 'function') {
      throw new TypeError('no getContext');
    }
    Reflect.set(globalThis, 'agarWebGLContexts', 0);
    const getContext = new Proxy(original, {
      apply: (target, self, args: unknown[]): unknown => {
        const kind = String(args[0]);
        const context: unknown = kinds.includes(kind) ? null : Reflect.apply(target, self, args);
        const counted = Number(Reflect.get(globalThis, 'agarWebGLContexts'));
        Reflect.set(globalThis, 'agarWebGLContexts', counted + Number(kind === 'webgl2' && context !== null));
        return context;
      },
    });
    Object.defineProperty(prototype, 'getContext', { value: getContext });
  }, refused);
}

/** How many WebGL2 contexts the page has made since `patchContexts`. */
export async function webGLContexts(page: Page): Promise<number> {
  const count = await page.evaluate(() => Number(Reflect.get(globalThis, 'agarWebGLContexts')));
  return count;
}

/** Whether the browser can make a WebGL2 context at all. Call it after reading `webGLContexts`, since it makes one. */
export async function supportsWebGL2(page: Page): Promise<boolean> {
  const supported = await page.evaluate(() => document.createElement('canvas').getContext('webgl2') !== null);
  return supported;
}

/** The jelly's colour at the middle of a component's canvas, as [red, green, blue, alpha] bytes. */
export async function middleColour(content: Locator): Promise<number[]> {
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
export function colourGap(from: readonly number[], to: readonly number[]): number {
  return Math.max(...to.map((channel, index) => Math.abs(channel - (from[index] ?? 0))));
}
