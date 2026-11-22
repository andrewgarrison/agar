// Jelly physics, with no DOM or drawing.
//
// A body's four edges are springs that chase a target rectangle (edges.ts).
// Round them sits a ring of particles (surface-ring.ts) that wobbles about a
// goal shape between the edges (goal-shape.ts). Volume is conserved: the body
// gets thinner when stretched and fatter when squashed.
//
// Coordinates are CSS px in whatever space the owner measures in (usually its
// surface's container). The renderer reads `pts`.

import { Edges } from './edges';
import type { Point, Rect } from './geometry';
import type { GoalBox } from './goal-shape';
import { breathe, goalBox, reach, traceGoal } from './goal-shape';
import { prefersReducedMotion } from './motion';
import type { JellyParams } from './params';
import { DEFAULT_PARAMS, RING } from './params';
import { SurfaceRing } from './surface-ring';

export interface BodyOptions {
  /** Corner radius in px. Leave it out for a pill (fully round ends). */
  radius?: number;
  params?: Partial<JellyParams>;
  /** Defaults to the user's `prefers-reduced-motion` setting. */
  reducedMotion?: boolean;
}

const FADE_RATE = 10;
const REST_RATE = 10;
const HOVER_RATE = 8;
const AWAKE = 0.001;
const OPACITY_STILL = 0.002;

function ease(value: number, goal: number, rate: number): number {
  return value + (goal - value) * Math.min(1, rate);
}

export class JellyBody {
  /** This body's tunables. Change them live; springs pick them up on their next move. */
  public readonly params: JellyParams;
  /** Ring points, x and y interleaved, ready for the renderer. */
  public readonly pts: Float32Array = new Float32Array(RING * 2);
  /** Overall opacity, 0 to 1. Use `fadeTo` to change it smoothly. */
  public opacity = 1;
  /** False until the first step. */
  public ready = false;

  private readonly radius: number | undefined;
  private readonly reducedMotion: boolean;
  private readonly edges: Edges;
  private readonly ring: SurfaceRing = new SurfaceRing(RING);
  private opacityGoal = 1;
  private fadeRate = FADE_RATE;
  private restWidth = 0;
  private home: Rect | null = null;
  private pointer: Point | null = null;
  private hover = 0;
  private time = 0;

  public constructor(options: BodyOptions = {}) {
    this.params = { ...DEFAULT_PARAMS, ...options.params };
    this.radius = options.radius;
    this.reducedMotion = options.reducedMotion ?? prefersReducedMotion();
    this.edges = new Edges(this.params, this.reducedMotion);
  }

  /** The current top and bottom edges, for the tint gradient. */
  public get yRange(): [number, number] {
    return [this.edges.top.position, this.edges.bottom.position];
  }

  /** Where the body lives when idle, or null before the first `place`. */
  public get rest(): Rect | null {
    return this.home;
  }

  /** Soft walls on the left and right: the body squashes against them. */
  public setBounds(min: number, max: number): void {
    this.edges.setBounds(min, max);
  }

  /** Puts the body somewhere instantly: the first paint, or after a resize. */
  public place(rect: Rect): void {
    this.home = rect;
    this.edges.jumpTo(rect);
    this.restWidth = rect.right - rect.left;
    this.ring.reset();
  }

  /** A press on another target: the leading edge tugs toward it. */
  public pressToward(target: Rect): void {
    if (this.home !== null) {
      this.edges.pressToward(this.home, target);
    }
  }

  /** A press on the body itself: squish. */
  public pressInPlace(): void {
    this.edges.poke.goal = 1;
  }

  /** Lets go: springs to `target`, or back home when it's null. */
  public release(target: Rect | null): void {
    this.edges.poke.goal = 0;
    if (this.home === null) {
      return;
    }
    if (target === null) {
      this.edges.settleAt(this.home);
    } else {
      this.edges.moveTo(this.home, target);
      this.home = target;
    }
  }

  /** Moves straight to a new target, as a keyboard press or back/forward does. */
  public moveTo(target: Rect): void {
    this.release(target);
  }

  /** Grows or shrinks to a rectangle, every edge springing on its own (popovers). */
  public morphTo(target: Rect): void {
    this.edges.morphTo(target);
    this.restWidth = target.right - target.left;
    this.home = target;
  }

  /** Eases opacity toward `goal`, at roughly `rate` per second. */
  public fadeTo(goal: number, rate: number = FADE_RATE): void {
    this.opacityGoal = goal;
    this.fadeRate = rate;
    if (this.reducedMotion) {
      this.opacity = goal;
    }
  }

  /** The pointer, in the body's coordinates, or null when it leaves. */
  public setPointer(point: Point | null): void {
    this.pointer = point;
  }

  /**
   * True when nothing is moving and nothing will move on its own. A placed
   * body stays awake until its first step, since it can't be drawn before then.
   */
  public isAsleep(): boolean {
    if (this.home === null) {
      return true;
    }
    if (!this.ready) {
      return false;
    }
    const idle = this.reducedMotion || this.params.breathe === 0;
    return (
      idle &&
      this.pointer === null &&
      this.hover <= AWAKE &&
      Math.abs(this.opacity - this.opacityGoal) <= OPACITY_STILL &&
      this.edges.isStill() &&
      this.ring.isStill()
    );
  }

  /** Advances the simulation by `dt` seconds. The stage calls this with a fixed step. */
  public step(dt: number): void {
    if (this.home === null) {
      return;
    }
    this.edges.step(dt, this.restWidth);
    this.ease(this.home, dt);
    const { edges, params, restWidth, reducedMotion } = this;
    const box = goalBox({ edges, params, restWidth, reducedMotion });
    this.shape(box);
    const frame = { params, motion: reducedMotion ? 0 : 1, centerX: (box.left + box.right) / 2, dt };
    this.ring.step({ ...frame, halfWidth: (box.right - box.left) / 2 }, this.pts);
    this.ready = true;
  }

  private ease(home: Rect, dt: number): void {
    this.time += dt;
    this.opacity = ease(this.opacity, this.opacityGoal, dt * this.fadeRate);
    this.restWidth = ease(this.restWidth, home.right - home.left, dt * REST_RATE);
    const hoverGoal = this.pointer !== null && !this.reducedMotion ? 1 : 0;
    this.hover = ease(this.hover, hoverGoal, dt * HOVER_RATE);
  }

  private shape(box: GoalBox): void {
    const { goals } = this.ring;
    traceGoal(box, this.radius, goals);
    breathe(goals, this.reducedMotion ? 0 : this.params.breathe, this.time);
    if (this.pointer !== null && this.hover > AWAKE) {
      reach(goals, { pointer: this.pointer, strength: this.hover, params: this.params });
    }
  }
}
