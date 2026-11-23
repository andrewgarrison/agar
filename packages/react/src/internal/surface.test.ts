import { JellySurface } from '@agar/core';
import { describe, expect, it, vi } from 'vitest';

import { noop } from './noop';

// Core's tests stay DOM-free, so the stage's DOM behaviour is tested here.

function isContext(value: unknown): value is CanvasRenderingContext2D {
  return (
    (typeof value === 'function' || typeof value === 'object') &&
    value !== null &&
    typeof Reflect.get(value, 'drawImage') === 'function'
  );
}

// A 2D context that accepts every call.
function fakeContext(): CanvasRenderingContext2D {
  const fake: unknown = new Proxy(() => fake, { get: () => fake });
  if (!isContext(fake)) {
    throw new TypeError('expected a context');
  }
  return fake;
}

type Report = (entries: readonly { isIntersecting: boolean }[]) => void;

// Captures what the surface's IntersectionObserver is handed.
function stubIntersectionObserver(): { report: Report } {
  const sink: { report: Report } = { report: noop };
  class Observer {
    public readonly observe = vi.fn<() => void>();
    public readonly disconnect = vi.fn<() => void>();

    public constructor(report: Report) {
      sink.report = report;
    }
  }
  vi.stubGlobal('IntersectionObserver', Observer);
  return sink;
}

describe(JellySurface, () => {
  it('goes by the latest of several visibility entries', () => {
    expect.assertions(2);
    const observer = stubIntersectionObserver();
    const context = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    const surface = new JellySurface(document.createElement('canvas'));
    // Hidden, then shown again before the observer reported.
    observer.report([{ isIntersecting: false }, { isIntersecting: true }]);
    expect(surface.onScreen).toBe(true);
    observer.report([{ isIntersecting: true }, { isIntersecting: false }]);
    expect(surface.onScreen).toBe(false);
    surface.destroy();
  });
});
