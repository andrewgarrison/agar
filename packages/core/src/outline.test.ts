// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { outlinePath } from './outline';

const POINTS = 56;

// A ring of points round a circle, clockwise on screen, or the other way round.
function circle(radius: number, clockwise = true): Float32Array {
  const pts = new Float32Array(POINTS * 2);
  for (let index = 0; index < POINTS; index += 1) {
    const angle = ((clockwise ? index : -index) / POINTS) * Math.PI * 2;
    pts[index * 2] = 50 + Math.cos(angle) * radius;
    pts[index * 2 + 1] = 50 + Math.sin(angle) * radius;
  }
  return pts;
}

// The path's points, as [x, y] pairs.
function points(path: string): number[][] {
  return [...path.matchAll(/[ML](?<x>[\d.-]+) (?<y>[\d.-]+)/gu)].map((match) => [
    Number(match.groups?.x),
    Number(match.groups?.y),
  ]);
}

function distances(path: string): number[] {
  return points(path).map(([x = 0, y = 0]) => Math.round(Math.hypot(x - 50, y - 50)));
}

describe(outlinePath, () => {
  it('rounds the ring out by ROUND px, as the renderer draws it', () => {
    expect.assertions(3);
    const path = outlinePath(circle(20));
    expect(path).toMatch(/^M80 50L.*Z$/u);
    expect(points(path)).toHaveLength(POINTS);
    expect(new Set(distances(path))).toStrictEqual(new Set([30]));
  });

  it('pushes outward whichever way the ring runs', () => {
    expect.assertions(1);
    const path = outlinePath(circle(20, false));
    expect(new Set(distances(path))).toStrictEqual(new Set([30]));
  });

  it('pulls the outline in by the inset', () => {
    expect.assertions(1);
    const path = outlinePath(circle(20), 2);
    expect(new Set(distances(path))).toStrictEqual(new Set([28]));
  });

  it('is empty for an empty ring', () => {
    expect.assertions(1);
    expect(outlinePath(new Float32Array())).toBe('');
  });
});
