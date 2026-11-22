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

function sharedGL(): GLRenderer | null {
  if (renderers.gl === undefined || renderers.gl?.lost === true) {
    try {
      renderers.gl = new GLRenderer();
    } catch {
      renderers.gl = null;
    }
  }
  return renderers.gl;
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
    gl.draw(target, items);
  }
}
