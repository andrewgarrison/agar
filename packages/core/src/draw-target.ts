import type { JellyBody } from './body';
import type { JellyPalette, Rgba } from './palettes';

/** A surface's 2D canvas, as the renderer draws into it. */
export interface DrawTarget {
  ctx: CanvasRenderingContext2D;
  /** Canvas size in device px. */
  width: number;
  height: number;
  dpr: number;
  /** Surface-space CSS px of the canvas's top-left corner. */
  origin: { x: number; y: number };
  /** The cursor, for lens lighting. Without it, the rim light stays where it is at rest. */
  light?: CursorLight;
}

/** The cursor in surface-space CSS px, and how far the rim light has turned to it (0 to 1). */
export interface CursorLight {
  x: number;
  y: number;
  mix: number;
}

export interface DrawItem {
  body: JellyBody;
  palette: Readonly<JellyPalette>;
}

const INVISIBLE = 0.001;

/** Whether a body has anything to draw yet. */
export function isVisible(body: JellyBody): boolean {
  return body.ready && body.opacity > INVISIBLE;
}

/**
 * Grows a canvas to at least `width` × `height`, never shrinking it. Setting
 * a canvas's size clears it and reallocates its buffer, even to the same
 * value, so it only happens when the canvas is too small.
 */
export function growCanvas(canvas: HTMLCanvasElement, width: number, height: number): void {
  if (canvas.width < width || canvas.height < height) {
    canvas.width = Math.max(canvas.width, width);
    canvas.height = Math.max(canvas.height, height);
  }
}

export function rgbaToArray(color: Rgba): [number, number, number, number] {
  return [color.red, color.green, color.blue, color.alpha];
}
