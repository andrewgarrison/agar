// A body's four edges (and its squish), each a spring chasing a target.

import type { Rect } from './geometry';
import { sameRect } from './geometry';
import type { JellyParams } from './params';
import type { Spring } from './spring';
import { createSpring, dampingFor, isStill, jump, stepSpring, tune } from './spring';

// A move with no sideways distance keeps the direction it had, so it never
// swaps which edge leads.
function directionOf(delta: number, previous: number): number {
  if (delta === 0) {
    return previous;
  }
  return delta < 0 ? -1 : 1;
}

export class Edges {
  public readonly left: Spring = createSpring();
  public readonly right: Spring = createSpring();
  public readonly top: Spring = createSpring();
  public readonly bottom: Spring = createSpring();
  /** 0 at rest, 1 fully squished by a press in place. */
  public readonly poke: Spring = createSpring();
  /** +1 for a move to the right, -1 to the left. */
  public direction = 1;
  private readonly params: Readonly<JellyParams>;
  private readonly reducedMotion: boolean;
  private bounds: [number, number] = [-Infinity, Infinity];

  public constructor(params: Readonly<JellyParams>, reducedMotion: boolean) {
    this.params = params;
    this.reducedMotion = reducedMotion;
    this.settle();
    this.tune(this.top, params.vertK, params.vertZ);
    this.tune(this.bottom, params.vertK, params.vertZ);
    this.tune(this.poke, params.pokeK, params.pokeZ);
  }

  public get width(): number {
    return this.right.position - this.left.position;
  }

  public get height(): number {
    return this.bottom.position - this.top.position;
  }

  private get all(): Spring[] {
    return [this.left, this.right, this.top, this.bottom, this.poke];
  }

  public setBounds(min: number, max: number): void {
    this.bounds = [min, max];
  }

  public jumpTo(rect: Rect): void {
    jump(this.left, rect.left);
    jump(this.right, rect.right);
    jump(this.top, rect.top);
    jump(this.bottom, rect.bottom);
  }

  public pressToward(home: Rect, target: Rect): void {
    const { params } = this;
    this.direction = directionOf(target.left - home.left, this.direction);
    const forward = this.direction > 0;
    const [lead, trail] = this.leadAndTrail();
    const from = forward ? home.right : home.left;
    const reach = ((forward ? target.right : target.left) - from) * params.pressReach;
    this.tuneSides(params.pressK, params.pressZ);
    lead.goal = from + Math.max(-params.pressMaxReach, Math.min(params.pressMaxReach, reach));
    // Wind up: the back edge leans away a touch.
    trail.goal = (forward ? home.left : home.right) - this.direction * 2;
    this.start();
  }

  /** A sideways move: the leading edge goes first, the trailing edge a beat later. */
  public moveTo(home: Rect, target: Rect): void {
    const { params } = this;
    this.direction = directionOf(target.left - home.left, this.direction);
    const [lead, trail] = this.leadAndTrail();
    this.tune(lead, params.leadK, params.leadZ);
    this.tune(trail, params.trailK, params.trailZ);
    this.aim(target);
    trail.delay = this.reducedMotion ? 0 : params.trailDelay;
  }

  /** Every edge springs to `target` on its own. */
  public morphTo(target: Rect): void {
    this.settle();
    this.aim(target);
  }

  /** The left and right edges spring back home. */
  public settleAt(home: Rect): void {
    this.settle();
    this.left.goal = home.left;
    this.right.goal = home.right;
    this.start();
  }

  public step(dt: number, restWidth: number): void {
    for (const spring of this.all) {
      stepSpring(spring, dt);
    }
    this.tether(dt, restWidth);
    this.walls(dt);
  }

  /** Whether every edge is already heading for `rect`. */
  public isAimedAt(rect: Rect): boolean {
    const goals = { left: this.left.goal, right: this.right.goal, top: this.top.goal, bottom: this.bottom.goal };
    return sameRect(goals, rect);
  }

  public isStill(): boolean {
    return this.all.every((spring) => isStill(spring));
  }

  private tune(spring: Spring, stiffness: number, ratio: number): void {
    // Reduced motion never overshoots.
    tune(spring, stiffness, this.reducedMotion ? Math.max(ratio, 1) : ratio);
  }

  private tuneSides(stiffness: number, ratio: number): void {
    this.tune(this.left, stiffness, ratio);
    this.tune(this.right, stiffness, ratio);
  }

  private settle(): void {
    this.tuneSides(this.params.settleK, this.params.settleZ);
  }

  private start(): void {
    this.left.delay = 0;
    this.right.delay = 0;
  }

  private leadAndTrail(): [Spring, Spring] {
    return this.direction > 0 ? [this.right, this.left] : [this.left, this.right];
  }

  private aim(target: Rect): void {
    this.start();
    this.left.goal = target.left;
    this.right.goal = target.right;
    this.top.goal = target.top;
    this.bottom.goal = target.bottom;
  }

  // Jelly can't stretch forever: past maxStretch, the back edge is pulled along.
  private tether(dt: number, restWidth: number): void {
    const { params } = this;
    const excess = this.width - Math.max(restWidth, this.height) * params.maxStretch;
    if (excess <= 0) {
      return;
    }
    const [lead, trail] = this.leadAndTrail();
    trail.delay = 0;
    trail.velocity += this.direction * params.tetherK * excess * dt;
    lead.velocity -= this.direction * params.tetherK * params.tetherDrag * excess * dt;
  }

  // Soft walls: an edge past one is pushed back, and damped only while it moves outward.
  private walls(dt: number): void {
    const { params, left, right } = this;
    const damping = dampingFor(params.wallK, params.wallZ);
    const [min, max] = this.bounds;
    if (left.position < min) {
      left.velocity += (params.wallK * (min - left.position) - damping * Math.min(left.velocity, 0)) * dt;
    }
    if (right.position > max) {
      right.velocity -= (params.wallK * (right.position - max) + damping * Math.max(right.velocity, 0)) * dt;
    }
  }
}
