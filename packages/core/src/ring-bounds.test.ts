// @vitest-environment node
import { describe, expect, it } from 'vitest';

import type { Point } from './geometry';
import { innerBox, ringBounds } from './ring-bounds';

const POINTS = 56;

// A ring of points round an ellipse.
function ellipse(centre: Point, rx: number, ry: number): Float32Array {
  const pts = new Float32Array(POINTS * 2);
  for (let index = 0; index < POINTS; index += 1) {
    const angle = (index / POINTS) * Math.PI * 2;
    pts[index * 2] = centre.x + Math.cos(angle) * rx;
    pts[index * 2 + 1] = centre.y + Math.sin(angle) * ry;
  }
  return pts;
}

// A ring round a rounded rectangle, as a panel's is at rest.
function roundedRect(width: number, height: number, radius: number): Float32Array {
  const corners = [
    [width - radius, height - radius],
    [radius, height - radius],
    [radius, radius],
    [width - radius, radius],
  ] as const;
  const perCorner = 14;
  const pts = new Float32Array(corners.length * perCorner * 2);
  for (const [corner, [cx, cy]] of corners.entries()) {
    for (let index = 0; index < perCorner; index += 1) {
      const angle = ((corner + index / (perCorner - 1)) * Math.PI) / 2;
      const at = (corner * perCorner + index) * 2;
      pts[at] = cx + Math.cos(angle) * radius;
      pts[at + 1] = cy + Math.sin(angle) * radius;
    }
  }
  return pts;
}

// A U shape: the bounding box's middle is outside the ring.
const CUP = new Float32Array([0, 0, 10, 0, 10, 90, 90, 90, 90, 0, 100, 0, 100, 100, 0, 100]);

describe(ringBounds, () => {
  it('is the box round every point', () => {
    expect.assertions(1);
    expect(ringBounds(ellipse({ x: 50, y: 20 }, 40, 10))).toStrictEqual({ left: 10, right: 90, top: 10, bottom: 30 });
  });
});

describe(innerBox, () => {
  it('fits a box just inside a panel at rest', () => {
    expect.assertions(1);
    const pts = roundedRect(300, 160, 10);
    expect(innerBox(pts, ringBounds(pts))).toStrictEqual({ left: 3, right: 297, top: 3, bottom: 157 });
  });

  it('insets further for a rounder ring', () => {
    expect.assertions(1);
    const pts = roundedRect(300, 160, 40);
    expect(innerBox(pts, ringBounds(pts))).toStrictEqual({ left: 12, right: 288, top: 12, bottom: 148 });
  });

  it('finds none in a ring too thin to hold one', () => {
    expect.assertions(1);
    const pts = ellipse({ x: 50, y: 50 }, 40, 2);
    expect(innerBox(pts, ringBounds(pts))).toBeNull();
  });

  it('finds none when the middle is outside the ring', () => {
    expect.assertions(1);
    expect(innerBox(CUP, ringBounds(CUP))).toBeNull();
  });
});
