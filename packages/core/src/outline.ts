// The drawn jelly's outline as an SVG path, so CSS can clip to it: a
// `backdrop-filter` blur clipped this way frosts only what's behind the jelly.

import { ROUND } from './params';

// Path coordinates to a tenth of a px: finer changes nothing on screen.
const PLACES = 10;

function fixed(value: number): number {
  return Math.round(value * PLACES) / PLACES;
}

// Twice the ring's signed area: positive when its points run clockwise on
// screen (y down).
function winding(pts: Float32Array): number {
  let sum = 0;
  for (let index = 0; index + 1 < pts.length; index += 2) {
    const next = (index + 2) % pts.length;
    sum += (pts[index] ?? 0) * (pts[next + 1] ?? 0) - (pts[next] ?? 0) * (pts[index + 1] ?? 0);
  }
  return sum;
}

// Point `index` pushed `reach` px outward, along the normal of the chord
// between its neighbours.
function pushed(pts: Float32Array, index: number, reach: number): [number, number] {
  const count = pts.length;
  const before = (index - 2 + count) % count;
  const after = (index + 2) % count;
  const dx = (pts[after] ?? 0) - (pts[before] ?? 0);
  const dy = (pts[after + 1] ?? 0) - (pts[before + 1] ?? 0);
  const length = Math.hypot(dx, dy) || 1;
  return [(pts[index] ?? 0) + (dy / length) * reach, (pts[index + 1] ?? 0) - (dx / length) * reach];
}

/**
 * The outline the renderer draws for a ring of `x, y` pairs (the ring rounded
 * out by `ROUND` px), pulled in by `inset` px, as an SVG path in the ring's
 * own coordinates. Use it as `clip-path: path(...)`.
 */
export function outlinePath(pts: Float32Array, inset = 0): string {
  const direction = winding(pts) >= 0 ? 1 : -1;
  const reach = (ROUND - inset) * direction;
  const parts: string[] = [];
  for (let index = 0; index + 1 < pts.length; index += 2) {
    const [x, y] = pushed(pts, index, reach);
    parts.push(`${index === 0 ? 'M' : 'L'}${fixed(x)} ${fixed(y)}`);
  }
  return parts.length === 0 ? '' : `${parts.join('')}Z`;
}
