import { afterEach, describe, expect, it, vi } from 'vitest';

import { prefersReducedMotion } from './index';

describe(prefersReducedMotion, () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is false without matchMedia (SSR)', () => {
    expect.assertions(1);
    vi.stubGlobal('matchMedia', undefined);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('reads the media query', () => {
    expect.assertions(1);
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }));
    expect(prefersReducedMotion()).toBe(true);
  });
});
