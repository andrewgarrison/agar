import type { JellyPalette, Rgba } from '@agar/core';

/** The jelly's colour, or its top colour when `--agar-jelly-tint-bottom` is set too. */
export const TINT = '--agar-jelly-tint';
/** The jelly's colour at its bottom edge. Defaults to `--agar-jelly-tint`. */
export const TINT_BOTTOM = '--agar-jelly-tint-bottom';

const CHANNEL = 255;

// A 1×1 canvas that turns any colour the browser can paint into sRGB bytes.
// Colours are only read on mount and theme changes, so it isn't kept.
function scratchContext(): CanvasRenderingContext2D | null {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.getContext('2d', { willReadFrequently: true });
}

// Resolves `light-dark()`, `var()` and the like the way the container would,
// in its own colour scheme, by computing them on a throwaway child.
function computed(container: HTMLElement, value: string): string | null {
  const probe = document.createElement('span');
  probe.style.color = value;
  if (probe.style.color === '') {
    return null;
  }
  probe.hidden = true;
  container.append(probe);
  const { color } = getComputedStyle(probe);
  probe.remove();
  return color;
}

function toRgba(color: string): Rgba | null {
  const context = scratchContext();
  if (context === null) {
    return null;
  }
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [red = 0, green = 0, blue = 0, alpha = 0] = context.getImageData(0, 0, 1, 1).data;
  return { red: red / CHANNEL, green: green / CHANNEL, blue: blue / CHANNEL, alpha: alpha / CHANNEL };
}

function readColor(container: HTMLElement, property: string): Rgba | null {
  const value = getComputedStyle(container).getPropertyValue(property).trim();
  const color = value === '' ? null : computed(container, value);
  return color === null ? null : toRgba(color);
}

/**
 * The material's palette, with its colour replaced by `--agar-jelly-tint`
 * (and `--agar-jelly-tint-bottom`) where the container sets them. Lighting
 * stays the material's. Any colour that can't be read keeps the material's.
 */
export function withCustomTint(palette: Readonly<JellyPalette>, container: HTMLElement): JellyPalette {
  try {
    const top = readColor(container, TINT);
    const bottom = readColor(container, TINT_BOTTOM) ?? top;
    return { ...palette, tintTop: top ?? palette.tintTop, tintBottom: bottom ?? palette.tintBottom };
  } catch {
    // No canvas to read colours with (jsdom, or a locked-down browser).
    return { ...palette };
  }
}
