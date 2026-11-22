// The shape a body's surface wants to sit on: a rounded rectangle between its
// edges, squished by a press, conserving volume, with idle breathing and a
// reach toward a nearby pointer.

import type { Edges } from './edges';
import type { Point } from './geometry';
import type { JellyParams } from './params';
import { ROUND } from './params';
import type { SurfacePoint } from './shape';
import { traceRoundedRect } from './shape';

// Idle breathing: two slow waves travelling round the surface.
const BREATH = { slowWeight: 0.6, slowSpeed: 1.7, slowWaves: 2, fastWeight: 0.4, fastSpeed: 2.6, fastWaves: 3 };
const BREATH_PHASE = 1.3;
const MIN_HALF_SIZE = 0.5;
const NEAR = 0.001;

/** The goal shape's box, after the squish and volume have changed it. */
export interface GoalBox {
  left: number;
  right: number;
  centerY: number;
  height: number;
}

export interface GoalInput {
  edges: Edges;
  params: Readonly<JellyParams>;
  restWidth: number;
  reducedMotion: boolean;
}

export function goalBox({ edges, params, restWidth, reducedMotion }: GoalInput): GoalBox {
  const poke = edges.poke.position;
  const height = Math.max(1, edges.height);
  // A press in place widens the body. It's never thinner than a circle.
  const width = Math.max(edges.width + 2 * poke * params.pokeWiden, Math.min(height, 2 * ROUND + 2));
  const middle = (edges.left.position + edges.right.position) / 2;
  // Keep the volume roughly constant: thinner when long, fatter when short.
  const volume = reducedMotion ? 1 : (Math.max(restWidth, 1) / width) ** params.volumeExp;
  const squash = Math.min(params.volumeMax, Math.max(params.volumeMin, volume)) * (1 - poke * params.pokeFlatten);
  return {
    left: middle - width / 2,
    right: middle + width / 2,
    centerY: (edges.top.position + edges.bottom.position) / 2,
    height: height * squash,
  };
}

/** Writes the goal shape for `box` into `goals`. Leave `radius` out for a pill. */
export function traceGoal(box: GoalBox, radius: number | undefined, goals: readonly SurfacePoint[]): void {
  const halfWidth = Math.max(MIN_HALF_SIZE, (box.right - box.left) / 2 - ROUND);
  const halfHeight = Math.max(MIN_HALF_SIZE, box.height / 2 - ROUND);
  const corner = radius === undefined ? Infinity : radius - ROUND;
  traceRoundedRect(
    {
      centerX: (box.left + box.right) / 2,
      centerY: box.centerY,
      halfWidth,
      halfHeight,
      radius: Math.max(1, Math.min(corner, halfWidth, halfHeight)),
    },
    goals,
  );
}

/** Idle life: waves of `amount` px travelling round the surface at time `t`. */
export function breathe(goals: readonly SurfacePoint[], amount: number, t: number): void {
  if (amount === 0) {
    return;
  }
  for (const [index, goal] of goals.entries()) {
    const turn = (index / goals.length) * 2 * Math.PI;
    const slow = BREATH.slowWeight * Math.sin(t * BREATH.slowSpeed + turn * BREATH.slowWaves);
    const fast = BREATH.fastWeight * Math.sin(t * BREATH.fastSpeed - turn * BREATH.fastWaves + BREATH_PHASE);
    goal.x += goal.nx * amount * (slow + fast);
    goal.y += goal.ny * amount * (slow + fast);
  }
}

export interface Hover {
  pointer: Point;
  /** Eases the reach in and out, 0 to 1. */
  strength: number;
  params: Readonly<JellyParams>;
}

/** The surface reaches toward a nearby pointer. */
export function reach(goals: readonly SurfacePoint[], { pointer, strength, params }: Hover): void {
  for (const goal of goals) {
    const towardX = pointer.x - goal.x;
    const towardY = pointer.y - goal.y;
    const distance = Math.hypot(towardX, towardY);
    if (distance < params.hoverRadius && distance > NEAR) {
      const pull = (1 - distance / params.hoverRadius) ** 2 * params.hoverReach * strength;
      goal.x += (towardX / distance) * pull;
      goal.y += (towardY / distance) * pull;
    }
  }
}
