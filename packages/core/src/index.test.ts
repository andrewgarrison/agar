// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { JellyBody, surfaceCount } from './index';
import { fragmentShader } from './shader';

describe('@agar/core', () => {
  it('imports without a DOM and makes no surfaces (SSR)', () => {
    expect.assertions(2);
    expect(surfaceCount()).toBe(0);
    expect(() => new JellyBody({ reducedMotion: false })).not.toThrow();
  });

  it('compiles the shader for the ring size', () => {
    expect.assertions(2);
    const source = fragmentShader(56);
    expect(source.startsWith('#version 300 es\n')).toBe(true);
    expect(source).toContain('#define N 56\n');
  });
});
