// @vitest-environment node
import { describe, expect, it } from 'vitest';

import type { Tickable } from './loop';
import { Loop } from './loop';
import { STEP } from './params';
import type { FakePage } from './test-page';
import { fakePage } from './test-page';

// How long the renderer's warm-up takes in these tests.
const WARM_UP_MS = 150;

interface Recorder extends Tickable {
  readonly steps: number[];
}

// A surface that stays awake and records how many steps each frame gave it.
// `onTick` runs after recording, as the drawing would.
function recorder(onTick: () => void = (): void => undefined): Recorder {
  const steps: number[] = [];
  return {
    awake: true,
    onScreen: true,
    steps,
    tick: (count): void => {
      steps.push(count);
      onTick();
    },
  };
}

function start(loop: Loop, surface: Recorder): void {
  loop.surfaces.add(surface);
  loop.wake();
}

// A loop whose first frame warms the renderer up, which takes WARM_UP_MS.
function warmingUp(page: FakePage): Recorder {
  const counter = { warmUps: 0 };
  const loop = new Loop(() => counter.warmUps);
  const surface = recorder(() => {
    if (counter.warmUps === 0) {
      counter.warmUps = 1;
      page.setNow(performance.now() + WARM_UP_MS);
    }
  });
  start(loop, surface);
  return surface;
}

describe(Loop, () => {
  it('steps the time since the last frame, up to a tenth of a second', () => {
    expect.assertions(1);
    const page = fakePage();
    const surface = recorder();
    start(new Loop(), surface);
    page.frameAt(16);
    page.frameAt(16 + 40);
    page.frameAt(16 + 40 + 500);
    expect(surface.steps.slice(1)).toStrictEqual([Math.round(0.04 / STEP), Math.round(0.1 / STEP)]);
  });

  it("leaves the renderer's warm-up out of the physics", () => {
    expect.assertions(1);
    const page = fakePage();
    const surface = warmingUp(page);
    page.frameAt(25);
    // The next frame comes 25ms after the warm-up ended: it steps 25ms, not 175.
    page.frameAt(25 + WARM_UP_MS + 25);
    expect(surface.steps[1]).toBe(Math.round(0.025 / STEP));
  });

  it('never counts backwards when a frame began before the wake', () => {
    expect.assertions(2);
    const page = fakePage();
    const surface = recorder();
    page.setNow(20);
    start(new Loop(), surface);
    // A frame that began at 12ms, before the wake.
    page.frameAt(12);
    page.frameAt(12 + 16);
    expect(surface.steps[0]).toBe(0);
    expect(surface.steps[1]).toBe(Math.floor(0.016 / STEP));
  });
});
