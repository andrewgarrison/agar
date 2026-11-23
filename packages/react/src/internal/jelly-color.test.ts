import { JELLY_PALETTES } from '@agar/core';
import { describe, expect, it, vi } from 'vitest';

import { withCustomTint } from './jelly-color';

const GLASS = JELLY_PALETTES.glass.light;

function container(style: string): HTMLElement {
  const element = document.createElement('div');
  element.setAttribute('style', style);
  document.body.append(element);
  return element;
}

// Real colour reading needs a canvas, so e2e/popover.spec.ts checks the drawn
// colour. Here: every way it can't read one keeps the material's palette.
describe(withCustomTint, () => {
  it('keeps the material palette when no tint is set', () => {
    expect.assertions(1);
    expect(withCustomTint(GLASS, container(''))).toStrictEqual(GLASS);
  });

  it('keeps the material palette for a value that is not a colour', () => {
    expect.assertions(1);
    expect(withCustomTint(GLASS, container('--agar-jelly-tint: nonsense'))).toStrictEqual(GLASS);
  });

  it('keeps the material palette when there is no canvas to read colours with', () => {
    expect.assertions(1);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(withCustomTint(GLASS, container('--agar-jelly-tint: #ff0000'))).toStrictEqual(GLASS);
  });

  it('returns a copy, so a surface can never change the shared palette', () => {
    expect.assertions(1);
    expect(withCustomTint(GLASS, container(''))).not.toBe(GLASS);
  });
});
