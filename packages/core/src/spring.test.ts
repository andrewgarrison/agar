// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { createSpring, isStill, jump, stepSpring, tune } from './spring';

const DT = 1 / 240;

function run(spring: ReturnType<typeof createSpring>, seconds: number): number {
  let peak = spring.position;
  for (let elapsed = 0; elapsed < seconds; elapsed += DT) {
    stepSpring(spring, DT);
    peak = Math.max(peak, spring.position);
  }
  return peak;
}

describe('spring', () => {
  it('settles on its goal', () => {
    expect.assertions(2);
    const spring = createSpring();
    tune(spring, 400, 0.6);
    spring.goal = 10;
    run(spring, 3);
    expect(spring.position).toBeCloseTo(10, 2);
    expect(isStill(spring)).toBe(true);
  });

  it('overshoots when underdamped', () => {
    expect.assertions(1);
    const spring = createSpring();
    tune(spring, 400, 0.3);
    spring.goal = 10;
    expect(run(spring, 1)).toBeGreaterThan(10.5);
  });

  it('never overshoots when critically damped', () => {
    expect.assertions(1);
    const spring = createSpring();
    tune(spring, 400, 1);
    spring.goal = 10;
    expect(run(spring, 3)).toBeLessThanOrEqual(10);
  });

  it('waits out its delay before moving', () => {
    expect.assertions(2);
    const spring = createSpring();
    tune(spring, 400, 1);
    spring.goal = 10;
    spring.delay = 0.1;
    run(spring, 0.09);
    expect(spring.position).toBe(0);
    run(spring, 0.1);
    expect(spring.position).toBeGreaterThan(0);
  });

  it('jumps to rest', () => {
    expect.assertions(3);
    const spring = createSpring();
    spring.velocity = 50;
    jump(spring, 4);
    expect(spring.position).toBe(4);
    expect(spring.goal).toBe(4);
    expect(isStill(spring)).toBe(true);
  });
});
