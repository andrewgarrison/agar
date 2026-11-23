// The WebGL2 renderer. One instance is shared by every surface on the page.

import type { JellyBody } from './body';
import type { DrawItem, DrawTarget } from './draw-target';
import { growCanvas, isVisible, rgbaToArray } from './draw-target';
import type { Rect } from './geometry';
import { RING, ROUND } from './params';
import { innerBox, ringBounds } from './ring-bounds';
import { fragmentShader, VERTEX_SHADER } from './shader';

const TRIANGLE = 3;
// How far past the ring anything is drawn, in CSS px: the rounding, then the
// drop shadow, which fades out past the edge and sits lower (see shader.ts).
const SHADOW_FADE = 5;
const SHADOW_DROP = 2.5;
const REACH = ROUND + SHADOW_FADE + SHADOW_DROP;
// An inner box no pixel is in.
const NO_BOX: Rect = { left: 0, right: 0, top: 0, bottom: 0 };

interface Uniforms {
  points: WebGLUniformLocation | null;
  origin: WebGLUniformLocation | null;
  dpr: WebGLUniformLocation | null;
  height: WebGLUniformLocation | null;
  round: WebGLUniformLocation | null;
  yRange: WebGLUniformLocation | null;
  tintTop: WebGLUniformLocation | null;
  tintBottom: WebGLUniformLocation | null;
  effects: WebGLUniformLocation | null;
  shadow: WebGLUniformLocation | null;
  opacity: WebGLUniformLocation | null;
  inner: WebGLUniformLocation | null;
}

function locate(gl: WebGL2RenderingContext, program: WebGLProgram): Uniforms {
  return {
    points: gl.getUniformLocation(program, 'uPts'),
    origin: gl.getUniformLocation(program, 'uOrigin'),
    dpr: gl.getUniformLocation(program, 'uDpr'),
    height: gl.getUniformLocation(program, 'uHeight'),
    round: gl.getUniformLocation(program, 'uRound'),
    yRange: gl.getUniformLocation(program, 'uYRange'),
    tintTop: gl.getUniformLocation(program, 'uTintTop'),
    tintBottom: gl.getUniformLocation(program, 'uTintBottom'),
    effects: gl.getUniformLocation(program, 'uFx'),
    shadow: gl.getUniformLocation(program, 'uShadow'),
    opacity: gl.getUniformLocation(program, 'uOpacity'),
    inner: gl.getUniformLocation(program, 'uInner'),
  };
}

function compile(gl: WebGL2RenderingContext, type: GLenum, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (shader === null) {
    throw new Error('Jelly: could not create a shader');
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) !== true) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Jelly: shader failed to compile: ${log ?? ''}`);
  }
  return shader;
}

function link(gl: WebGL2RenderingContext): WebGLProgram {
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentShader(RING)));
  gl.linkProgram(program);
  if (gl.getProgramParameter(program, gl.LINK_STATUS) !== true) {
    throw new Error(`Jelly: shader failed to link: ${gl.getProgramInfoLog(program) ?? ''}`);
  }
  return program;
}

function createContext(canvas: HTMLCanvasElement): WebGL2RenderingContext {
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true });
  if (gl === null) {
    throw new Error('Jelly: WebGL2 is not available');
  }
  // The full-screen triangle needs a bound vertex array but no buffers.
  gl.bindVertexArray(gl.createVertexArray());
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.SCISSOR_TEST);
  return gl;
}

// Limits drawing to the ring's box, plus REACH, in device px with GL's origin
// at the bottom left. The fragment shader walks the whole ring for every
// pixel, so skipping the empty canvas margin halves the cost of a big panel:
// it matters wherever WebGL runs in software.
function scissorTo(gl: WebGL2RenderingContext, target: DrawTarget, bounds: Rect): void {
  const { origin, dpr, height } = target;
  const x0 = Math.max(0, Math.floor((bounds.left - REACH - origin.x) * dpr));
  const x1 = Math.ceil((bounds.right + REACH - origin.x) * dpr);
  const y0 = Math.max(0, Math.floor(height - (bounds.bottom + REACH - origin.y) * dpr));
  const y1 = Math.ceil(height - (bounds.top - REACH - origin.y) * dpr);
  gl.scissor(x0, y0, Math.max(0, x1 - x0), Math.max(0, y1 - y0));
}

// Draw in the bottom-left width × height (GL's origin): the top-left once the
// copy reads from canvas.height - height.
function clear(gl: WebGL2RenderingContext, width: number, height: number): void {
  gl.viewport(0, 0, width, height);
  gl.scissor(0, 0, width, height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

export class GLRenderer {
  /** The shared offscreen canvas. It grows to fit the biggest surface. */
  public readonly canvas: HTMLCanvasElement;
  /** Set when the browser drops the context; the next draw makes a new renderer. */
  public lost = false;
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly uniforms: Uniforms;

  /** Throws when WebGL2 isn't available, or the shaders don't build. */
  public constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1;
    this.canvas.height = 1;
    this.gl = createContext(this.canvas);
    this.program = link(this.gl);
    this.uniforms = locate(this.gl, this.program);
    this.canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.lost = true;
    });
  }

  /** Draws the bodies, then copies them into the surface in the same task. */
  public draw(target: DrawTarget, items: readonly DrawItem[]): void {
    this.prepare(target);
    for (const item of items) {
      if (isVisible(item.body)) {
        this.drawBody(target, item);
      }
    }
    // Copy before the drawing buffer is discarded, so no preserveDrawingBuffer.
    const { ctx, width, height } = target;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'copy';
    ctx.drawImage(this.canvas, 0, this.canvas.height - height, width, height, 0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
  }

  private prepare(target: DrawTarget): void {
    const { gl, uniforms } = this;
    const { height } = target;
    growCanvas(this.canvas, target.width, height);
    clear(gl, target.width, height);
    gl.useProgram(this.program);
    gl.uniform2f(uniforms.origin, target.origin.x, target.origin.y);
    gl.uniform1f(uniforms.dpr, target.dpr);
    gl.uniform1f(uniforms.height, height);
    gl.uniform1f(uniforms.round, ROUND);
  }

  // Uploads the body's ring, and limits drawing to round it: the scissor
  // skips the empty margin, the inner box skips the ring walk inside it.
  private setRing(target: DrawTarget, body: JellyBody): void {
    const { gl, uniforms } = this;
    const [top, bottom] = body.yRange;
    gl.uniform2fv(uniforms.points, body.pts);
    gl.uniform2f(uniforms.yRange, top, bottom);
    const bounds = ringBounds(body.pts);
    scissorTo(gl, target, bounds);
    const inner = innerBox(body.pts, bounds) ?? NO_BOX;
    gl.uniform4f(uniforms.inner, inner.left, inner.top, inner.right, inner.bottom);
  }

  private drawBody(target: DrawTarget, { body, palette }: DrawItem): void {
    const { gl, uniforms } = this;
    this.setRing(target, body);
    gl.uniform4fv(uniforms.tintTop, rgbaToArray(palette.tintTop));
    gl.uniform4fv(uniforms.tintBottom, rgbaToArray(palette.tintBottom));
    gl.uniform4f(uniforms.effects, palette.specular, palette.rim, palette.glow, palette.stroke);
    gl.uniform1f(uniforms.shadow, palette.shadow);
    gl.uniform1f(uniforms.opacity, body.opacity);
    gl.drawArrays(gl.TRIANGLES, 0, TRIANGLE);
  }
}
