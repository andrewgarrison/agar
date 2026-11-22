import type { Rect } from '@agar/core';

/** An element's box in its offsetParent's padding box, the space a surface measures in. */
export function rectOf(element: HTMLElement): Rect {
  return {
    left: element.offsetLeft,
    right: element.offsetLeft + element.offsetWidth,
    top: element.offsetTop,
    bottom: element.offsetTop + element.offsetHeight,
  };
}

/** The same box, flipped left to right inside a container `width` wide. */
export function mirrored(rect: Rect, width: number): Rect {
  return { ...rect, left: width - rect.right, right: width - rect.left };
}
