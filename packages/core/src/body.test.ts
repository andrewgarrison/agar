// @vitest-environment node
import { describe, expect, it } from 'vitest';

import type { BodyOptions } from './body';
import { JellyBody } from './body';
import type { Rect } from './geometry';
import { RING, ROUND, STEP } from './params';

const HOME: Rect = { left: 0, right: 60, top: 0, bottom: 30 };
const AWAY: Rect = { left: 200, right: 260, top: 0, bottom: 30 };
const FAR: Rect = { left: 2000, right: 2060, top: 0, bottom: 30 };

function simulate(body: JellyBody, seconds: number, each?: () => void): void {
  for (let elapsed = 0; elapsed < seconds; elapsed += STEP) {
    body.step(STEP);
    each?.();
  }
}

// The ring's bounding box, grown back out by ROUND (the renderer's rounding).
function bounds(body: JellyBody): Rect {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let index = 0; index < RING; index += 1) {
    xs.push(body.pts[index * 2] ?? Number.NaN);
    ys.push(body.pts[index * 2 + 1] ?? Number.NaN);
  }
  return {
    left: Math.min(...xs) - ROUND,
    right: Math.max(...xs) + ROUND,
    top: Math.min(...ys) - ROUND,
    bottom: Math.max(...ys) + ROUND,
  };
}

function width(rect: Rect): number {
  return rect.right - rect.left;
}

function height(rect: Rect): number {
  return rect.bottom - rect.top;
}

// A body at HOME with breathing off, so it can fall asleep.
function placed(options: BodyOptions = {}): JellyBody {
  const body = new JellyBody({ reducedMotion: false, ...options, params: { breathe: 0, ...options.params } });
  body.place(HOME);
  return body;
}

// The largest width and smallest height the body reaches over `seconds`.
function extremes(body: JellyBody, seconds: number): { widest: number; thinnest: number } {
  let widest = 0;
  let thinnest = Infinity;
  simulate(body, seconds, () => {
    const box = bounds(body);
    widest = Math.max(widest, width(box));
    thinnest = Math.min(thinnest, height(box));
  });
  return { widest, thinnest };
}

function widestOnFarMove(tetherK: number): number {
  const body = placed({ params: { tetherK } });
  body.moveTo(FAR);
  return extremes(body, 2).widest;
}

describe('placing a body', () => {
  it('sleeps and draws nothing before it is placed', () => {
    expect.assertions(2);
    const body = new JellyBody({ reducedMotion: false, params: { breathe: 0 } });
    body.step(STEP);
    expect(body.isAsleep()).toBe(true);
    expect(body.ready).toBe(false);
  });

  it('stays awake until its first step, so it gets drawn', () => {
    expect.assertions(3);
    const body = placed();
    expect(body.isAsleep()).toBe(false);
    body.step(STEP);
    expect(body.ready).toBe(true);
    expect(body.isAsleep()).toBe(true);
  });

  it('fills the rectangle it is placed on', () => {
    expect.assertions(1);
    const body = placed();
    body.step(STEP);
    const box = bounds(body);
    expect([box.left, box.right, box.top, box.bottom].map((edge) => Math.round(edge * 10) / 10)).toStrictEqual([
      HOME.left,
      HOME.right,
      HOME.top,
      HOME.bottom,
    ]);
  });

  it('gives each body its own params', () => {
    expect.assertions(1);
    const first = placed();
    first.params.surfK = 1;
    expect(placed().params.surfK).not.toBe(1);
  });
});

describe('moving a body', () => {
  it('springs to a new target and falls asleep there', () => {
    expect.assertions(3);
    const body = placed();
    body.moveTo(AWAY);
    simulate(body, 4);
    expect(bounds(body).left).toBeCloseTo(AWAY.left, 0);
    expect(bounds(body).right).toBeCloseTo(AWAY.right, 0);
    expect(body.isAsleep()).toBe(true);
  });

  it('stretches long and thin on the way, conserving volume', () => {
    expect.assertions(2);
    const body = placed();
    body.moveTo(AWAY);
    const { widest, thinnest } = extremes(body, 1);
    expect(widest).toBeGreaterThan(width(HOME) * 1.3);
    expect(thinnest).toBeLessThan(height(HOME) - 2);
  });

  it('is held back by its tether on a long move', () => {
    expect.assertions(1);
    expect(widestOnFarMove(1400)).toBeLessThan(widestOnFarMove(0) * 0.8);
  });

  it('grows to a new rectangle on every edge', () => {
    expect.assertions(2);
    const body = placed({ radius: 16 });
    const panel = { left: -40, right: 200, top: -100, bottom: 60 };
    body.morphTo(panel);
    simulate(body, 4);
    expect(width(bounds(body))).toBeCloseTo(width(panel), 0);
    expect(height(bounds(body))).toBeCloseTo(height(panel), 0);
  });

  it('squashes against a soft wall', () => {
    expect.assertions(1);
    const body = placed();
    body.setBounds(0, 120);
    body.moveTo(AWAY);
    simulate(body, 4);
    expect(bounds(body).right).toBeLessThan(AWAY.right);
  });
});

describe('pressing a body', () => {
  it('squishes wider and flatter when pressed in place', () => {
    expect.assertions(2);
    const body = placed();
    body.pressInPlace();
    simulate(body, 0.5);
    expect(width(bounds(body))).toBeGreaterThan(width(HOME) + 4);
    expect(height(bounds(body))).toBeLessThan(height(HOME) - 2);
  });

  it('recovers and sleeps once released', () => {
    expect.assertions(2);
    const body = placed();
    body.pressInPlace();
    simulate(body, 0.5);
    body.release(null);
    simulate(body, 3);
    expect(width(bounds(body))).toBeCloseTo(width(HOME), 0);
    expect(body.isAsleep()).toBe(true);
  });

  it('tugs toward a pressed target, but only so far', () => {
    expect.assertions(2);
    const body = placed();
    body.pressToward(AWAY);
    simulate(body, 0.5);
    expect(bounds(body).right).toBeGreaterThan(HOME.right + 5);
    expect(bounds(body).right).toBeLessThanOrEqual(HOME.right + body.params.pressMaxReach + 5);
  });

  it('springs home when released off the target', () => {
    expect.assertions(1);
    const body = placed();
    body.pressToward(AWAY);
    simulate(body, 0.5);
    body.release(null);
    simulate(body, 3);
    expect(bounds(body).right).toBeCloseTo(HOME.right, 0);
  });
});

describe('an idle body', () => {
  it('stays awake while it breathes', () => {
    expect.assertions(1);
    const body = placed({ params: { breathe: 0.5 } });
    simulate(body, 2);
    expect(body.isAsleep()).toBe(false);
  });

  it('stays awake while the pointer is over it, and sleeps once it leaves', () => {
    expect.assertions(2);
    const body = placed();
    body.setPointer({ x: 30, y: -5 });
    simulate(body, 1);
    expect(body.isAsleep()).toBe(false);
    body.setPointer(null);
    simulate(body, 3);
    expect(body.isAsleep()).toBe(true);
  });

  it('fades smoothly', () => {
    expect.assertions(2);
    const body = placed();
    body.fadeTo(0);
    simulate(body, 0.05);
    expect(body.opacity).toBeGreaterThan(0.1);
    expect(body.opacity).toBeLessThan(1);
  });
});

describe('a body with reduced motion', () => {
  it('neither overshoots nor wobbles', () => {
    expect.assertions(2);
    const body = placed({ reducedMotion: true });
    body.moveTo(AWAY);
    let furthest = 0;
    simulate(body, 3, () => {
      furthest = Math.max(furthest, bounds(body).right);
    });
    expect(furthest).toBeLessThanOrEqual(AWAY.right + 0.01);
    expect(height(bounds(body))).toBeCloseTo(height(HOME), 2);
  });

  it('sleeps once settled, even with breathing on', () => {
    expect.assertions(1);
    const body = placed({ reducedMotion: true, params: { breathe: 0.5 } });
    body.moveTo(AWAY);
    simulate(body, 3);
    expect(body.isAsleep()).toBe(true);
  });

  it('fades at once', () => {
    expect.assertions(1);
    const body = placed({ reducedMotion: true });
    body.fadeTo(0);
    expect(body.opacity).toBe(0);
  });
});
