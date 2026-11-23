// One WebGL2 context for every jelly on the page.
//
// Browsers only allow about 16 live WebGL contexts per page, so components
// never get their own. Each component has a plain 2D canvas (its surface), and
// the shared renderer draws that surface's bodies into one offscreen WebGL2
// canvas, then copies the pixels across. Canvas 2D is the fallback, and a lost
// context is recreated on the next draw.

import { CanvasRenderer } from './canvas-renderer';
import type { DrawItem, DrawTarget } from './draw-target';
import { GLRenderer } from './gl-renderer';

interface Renderers {
  // Undefined until the first draw; null when WebGL2 isn't available.
  gl: GLRenderer | null | undefined;
  canvas: CanvasRenderer | undefined;
}

const renderers: Renderers = { gl: undefined, canvas: undefined };
// One-off work the WebGL2 renderer has done (see `rendererWarmUps`).
const counts = { warmUps: 0 };

function sharedGL(): GLRenderer | null {
  if (renderers.gl === undefined || renderers.gl?.lost === true) {
    counts.warmUps += 1;
    try {
      renderers.gl = new GLRenderer();
    } catch {
      renderers.gl = null;
    }
  }
  return renderers.gl;
}

/**
 * How many times the shared renderer has done slow, one-off work: making its
 * WebGL2 context (on the page's first draw, or after a lost context), and
 * drawing its first body, when the browser compiles the shader for the GPU.
 * Either can take a tenth of a second or more on a busy machine, so the
 * loop leaves that time out of the physics.
 */
export function rendererWarmUps(): number {
  return counts.warmUps;
}

/** True when jelly draws with WebGL2; false when it falls back to Canvas 2D. */
export function isWebGL(): boolean {
  return sharedGL() !== null;
}

/** Draws a surface's bodies with the shared renderer. */
export function drawSurface(target: DrawTarget, items: readonly DrawItem[]): void {
  const gl = sharedGL();
  if (gl === null) {
    renderers.canvas ??= new CanvasRenderer();
    renderers.canvas.draw(target, items);
  } else {
    const cold = !gl.hasDrawn;
    gl.draw(target, items);
    counts.warmUps += Number(cold && gl.hasDrawn);
  }
}
