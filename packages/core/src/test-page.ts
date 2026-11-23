// Test helper: just enough of a page for the loop to run in node.
import { vi } from 'vitest';

export interface FakePage {
  /** Moves the clock without running a frame. */
  readonly setNow: (ms: number) => void;
  /** Moves the clock to `ms` and runs the animation frames queued so far. */
  readonly frameAt: (ms: number) => void;
}

export function fakePage(): FakePage {
  const clock = { now: 0 };
  let queued: FrameRequestCallback[] = [];
  vi.stubGlobal('document', { visibilityState: 'visible', addEventListener: vi.fn<() => void>() });
  vi.stubGlobal('performance', { now: () => clock.now });
  vi.stubGlobal('requestAnimationFrame', (frame: FrameRequestCallback) => {
    queued.push(frame);
    return queued.length;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn<() => void>());
  return {
    setNow: (ms): void => {
      clock.now = ms;
    },
    frameAt: (ms): void => {
      clock.now = ms;
      const due = queued;
      queued = [];
      for (const frame of due) {
        frame(ms);
      }
    },
  };
}
