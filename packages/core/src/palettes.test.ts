// @vitest-environment node
import { describe, expect, it } from 'vitest';

import type { JellyPalette } from './palettes';
import { JELLY_PALETTES } from './palettes';

function values(palette: Readonly<JellyPalette>): number[] {
  const { tintTop, tintBottom } = palette;
  return [
    tintTop.red,
    tintTop.green,
    tintTop.blue,
    tintTop.alpha,
    tintBottom.red,
    tintBottom.green,
    tintBottom.blue,
    tintBottom.alpha,
    palette.specular,
    palette.rim,
    palette.glow,
    palette.stroke,
    palette.shadow,
  ];
}

describe('jelly palettes', () => {
  const materials = Object.values(JELLY_PALETTES);

  it('has a light and a dark palette for every material', () => {
    expect.assertions(1);
    expect(materials.map((themes) => Object.keys(themes).toSorted().join(','))).toStrictEqual([
      'dark,light',
      'dark,light',
      'dark,light',
      'dark,light',
    ]);
  });

  it('keeps every colour channel and effect between 0 and 1', () => {
    expect.assertions(2);
    const all = materials.flatMap((themes) => [themes.light, themes.dark]).flatMap((palette) => values(palette));
    expect(Math.min(...all)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...all)).toBeLessThanOrEqual(1);
  });
});
