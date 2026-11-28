import { outlinePath } from '@agar/core';

import type { Jelly } from './use-jelly';

// How far inside the drawn edge the blur stops, in px, so the jelly's
// antialiased rim covers the clip's hard edge.
const INSET = 1;

/**
 * Clips a frosted-glass element (one with a `backdrop-filter`, laid over the
 * jelly's container at `inset: 0`) to the jelly's outline, so only what's
 * behind the jelly is blurred. Call it from `useJelly`'s `onDraw`. Until the
 * first draw the element keeps its CSS shape.
 */
export function clipToJelly(element: HTMLElement | null, jelly: Jelly): void {
  if (element !== null && jelly.body.ready) {
    element.style.clipPath = `path('${outlinePath(jelly.body.pts, INSET)}')`;
  }
}
