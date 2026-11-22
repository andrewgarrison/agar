/** A rectangle by its edges, in CSS px. */
export interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

// Edges closer than this, in px, are in the same place.
const SAME_EDGE = 0.5;

/** Whether two rectangles are the same box, give or take half a pixel. */
export function sameRect(from: Rect, to: Rect): boolean {
  return (
    Math.abs(from.left - to.left) < SAME_EDGE &&
    Math.abs(from.right - to.right) < SAME_EDGE &&
    Math.abs(from.top - to.top) < SAME_EDGE &&
    Math.abs(from.bottom - to.bottom) < SAME_EDGE
  );
}

export interface Point {
  x: number;
  y: number;
}
