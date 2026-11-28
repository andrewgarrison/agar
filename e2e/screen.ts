import type { Locator, Page } from '@playwright/test';

/** A screenshot, decoded: RGBA bytes, row by row. */
export interface Shot {
  readonly width: number;
  readonly height: number;
  readonly data: readonly number[];
}

/** An RGB colour, channels 0 to 255. */
export type Pixel = readonly number[];

/**
 * A screenshot of `locator` as the page composites it, backdrop filters and
 * all, which a canvas read-back can't see. The page decodes it.
 */
export async function shot(page: Page, locator: Locator): Promise<Shot> {
  const png = await locator.screenshot();
  const decoded = await page.evaluate(async (base64) => {
    const response = await fetch(`data:image/png;base64,${base64}`);
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('no 2D context');
    }
    context.drawImage(bitmap, 0, 0);
    const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
    return { width: bitmap.width, height: bitmap.height, data: [...data] };
  }, png.toString('base64'));
  return decoded;
}

/** The pixels between `from` and `to` of a shot's width and height. */
export function middle(image: Shot, from: number, to: number): Pixel[] {
  const pixels: Pixel[] = [];
  for (let y = Math.floor(image.height * from); y < image.height * to; y += 1) {
    for (let x = Math.floor(image.width * from); x < image.width * to; x += 1) {
      const at = (y * image.width + x) * 4;
      pixels.push([image.data[at] ?? 0, image.data[at + 1] ?? 0, image.data[at + 2] ?? 0]);
    }
  }
  return pixels;
}

/** WCAG relative luminance of an sRGB colour. */
export function luminance(channels: Pixel): number {
  const [red = 0, green = 0, blue = 0] = channels.map((byte) => {
    const value = byte / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** The WCAG contrast ratio between two luminances. */
export function contrast(from: number, to: number): number {
  return (Math.max(from, to) + 0.05) / (Math.min(from, to) + 0.05);
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** How much the pixels' brightness varies: stripes vary a lot, blurred stripes little. */
export function spread(pixels: readonly Pixel[]): number {
  const levels = pixels.map((pixel) => luminance(pixel));
  const average = mean(levels);
  const squares = levels.map((level) => (level - average) ** 2);
  return Math.sqrt(mean(squares));
}
