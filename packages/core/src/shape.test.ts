// @vitest-environment node
import { describe, expect, it } from 'vitest';

import type { RoundedRect, SurfacePoint } from './shape';
import { traceRoundedRect } from './shape';

function points(count: number): SurfacePoint[] {
  return Array.from({ length: count }, () => ({ x: 0, y: 0, nx: 0, ny: 0 }));
}

// Signed distance from a point to the rounded rectangle's outline.
function distanceTo(rect: RoundedRect, { x, y }: SurfacePoint): number {
  const qx = Math.abs(x - rect.centerX) - (rect.halfWidth - rect.radius);
  const qy = Math.abs(y - rect.centerY) - (rect.halfHeight - rect.radius);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rect.radius;
}

// Each point paired with the one before it, round the ring.
function pairs(ring: readonly SurfacePoint[]): [SurfacePoint, SurfacePoint][] {
  return ring.map((point, index) => [ring.at(index - 1) ?? point, point]);
}

function shoelace(ring: readonly SurfacePoint[]): number {
  return pairs(ring).reduce((sum, [previous, point]) => sum + previous.x * point.y - point.x * previous.y, 0);
}

function gaps(ring: readonly SurfacePoint[]): number[] {
  return pairs(ring).map(([previous, point]) => Math.hypot(point.x - previous.x, point.y - previous.y));
}

const RECT: RoundedRect = { centerX: 50, centerY: 20, halfWidth: 40, halfHeight: 12, radius: 6 };

describe(traceRoundedRect, () => {
  it('puts every point on the outline', () => {
    expect.assertions(1);
    const ring = points(56);
    traceRoundedRect(RECT, ring);
    const worst = Math.max(...ring.map((point) => Math.abs(distanceTo(RECT, point))));
    expect(worst).toBeLessThan(1e-9);
  });

  it('starts at the top centre, facing up', () => {
    expect.assertions(4);
    const ring = points(56);
    traceRoundedRect(RECT, ring);
    const [first] = ring;
    expect(first?.x).toBeCloseTo(50);
    expect(first?.y).toBeCloseTo(8);
    expect(first?.nx).toBeCloseTo(0);
    expect(first?.ny).toBeCloseTo(-1);
  });

  it('gives unit outward normals', () => {
    expect.assertions(2);
    const ring = points(56);
    traceRoundedRect(RECT, ring);
    expect(ring.every((point) => Math.abs(Math.hypot(point.nx, point.ny) - 1) < 1e-9)).toBe(true);
    // Outward: a step along the normal moves away from the centre.
    expect(
      ring.every(
        (point) =>
          Math.hypot(point.x + point.nx - RECT.centerX, point.y + point.ny - RECT.centerY) >
          Math.hypot(point.x - RECT.centerX, point.y - RECT.centerY),
      ),
    ).toBe(true);
  });

  it('runs clockwise on screen', () => {
    expect.assertions(1);
    const ring = points(56);
    traceRoundedRect(RECT, ring);
    // With y pointing down, a clockwise ring has a positive shoelace sum.
    expect(shoelace(ring)).toBeGreaterThan(0);
  });

  it('spaces the points evenly', () => {
    expect.assertions(1);
    const ring = points(56);
    traceRoundedRect(RECT, ring);
    const spacing = gaps(ring);
    expect(Math.max(...spacing) - Math.min(...spacing)).toBeLessThan(0.2);
  });

  it('traces a circle when the radius is the half-size', () => {
    expect.assertions(1);
    const circle: RoundedRect = { centerX: 0, centerY: 0, halfWidth: 10, halfHeight: 10, radius: 10 };
    const ring = points(32);
    traceRoundedRect(circle, ring);
    expect(ring.every((point) => Math.abs(Math.hypot(point.x, point.y) - 10) < 1e-9)).toBe(true);
  });
});
