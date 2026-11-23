// Boxes round and inside a body's ring, so the renderer can skip the pixels
// that don't need its full distance walk: outside the drawn body, and deep
// inside it, where the jelly is one flat colour.

import type { Point, Rect } from './geometry';

// Insets from the ring's bounding box to try, in px, doubling from the first
// to the last. A rounded panel at rest fits the first; wobbles need more.
const FIRST_INSET = 3;
const LAST_INSET = 24;

/** The bounding box of a ring of `x, y` pairs. */
export function ringBounds(pts: Float32Array): Rect {
  const box = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
  for (let index = 0; index + 1 < pts.length; index += 2) {
    const x = pts[index] ?? 0;
    const y = pts[index + 1] ?? 0;
    box.left = Math.min(box.left, x);
    box.right = Math.max(box.right, x);
    box.top = Math.min(box.top, y);
    box.bottom = Math.max(box.bottom, y);
  }
  return box;
}

interface Edge {
  readonly from: Point;
  readonly to: Point;
}

// The ring's edge from point `index` back to the point before it.
function edgeAt(pts: Float32Array, index: number): Edge {
  const last = (index === 0 ? pts.length : index) - 2;
  return {
    from: { x: pts[index] ?? 0, y: pts[index + 1] ?? 0 },
    to: { x: pts[last] ?? 0, y: pts[last + 1] ?? 0 },
  };
}

// Each side of the box as Liang–Barsky's (direction, room) pair for the edge.
function sides({ from, to }: Edge, box: Rect): (readonly [number, number])[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return [
    [-dx, from.x - box.left],
    [dx, box.right - from.x],
    [-dy, from.y - box.top],
    [dy, box.bottom - from.y],
  ];
}

// Liang–Barsky: whether any part of the edge lies in the box.
function touches(edge: Edge, box: Rect): boolean {
  let enter = 0;
  let leave = 1;
  for (const [direction, room] of sides(edge, box)) {
    if (direction === 0 && room < 0) {
      return false;
    }
    const at = room / direction;
    enter = direction < 0 ? Math.max(enter, at) : enter;
    leave = direction > 0 ? Math.min(leave, at) : leave;
  }
  return enter <= leave;
}

// Whether a ray from the point to the right crosses the edge (even-odd rule).
function crossesRay({ from, to }: Edge, point: Point): boolean {
  return (
    from.y > point.y !== to.y > point.y && point.x < ((to.x - from.x) * (point.y - from.y)) / (to.y - from.y) + from.x
  );
}

// Whether the box is wholly inside the ring: the ring doesn't cross it, and
// its centre is inside.
function holds(pts: Float32Array, box: Rect): boolean {
  const centre = { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 };
  let inside = false;
  for (let index = 0; index + 1 < pts.length; index += 2) {
    const edge = edgeAt(pts, index);
    if (touches(edge, box)) {
      return false;
    }
    inside = crossesRay(edge, centre) ? !inside : inside;
  }
  return inside;
}

/**
 * A box wholly inside the ring, or null when none of the tried insets fits
 * (a thin pill, or a wild wobble).
 */
export function innerBox(pts: Float32Array, bounds: Rect): Rect | null {
  for (let inset = FIRST_INSET; inset <= LAST_INSET; inset *= 2) {
    const box = {
      left: bounds.left + inset,
      right: bounds.right - inset,
      top: bounds.top + inset,
      bottom: bounds.bottom - inset,
    };
    if (box.left < box.right && box.top < box.bottom && holds(pts, box)) {
      return box;
    }
  }
  return null;
}
