// Jelly constants and tunables.

/** Particles around a body's ring. The shader is compiled for exactly this many. */
export const RING = 56;

/** The ring is the goal shape inset by this many px; the renderer rounds it back out. */
export const ROUND = 10;

const STEPS_PER_SECOND = 240;

/** The fixed physics step, in seconds. */
export const STEP: number = 1 / STEPS_PER_SECOND;

/**
 * A body's tunables. Springs are given as a stiffness (`K`) and a damping
 * ratio (`Z`): below 1 overshoots, 1 settles as fast as possible without
 * overshooting.
 */
export interface JellyParams {
  /** The leading edge of a sideways move. */
  leadK: number;
  leadZ: number;
  /** The trailing edge, which starts `trailDelay` seconds after the leading one. */
  trailK: number;
  trailZ: number;
  trailDelay: number;
  /** Both edges settling back home. */
  settleK: number;
  settleZ: number;
  /** Both edges while a press tugs the body toward another target. */
  pressK: number;
  pressZ: number;
  /** How far a press reaches toward its target, as a share of the distance. */
  pressReach: number;
  /** The most a press can reach, in px. */
  pressMaxReach: number;
  /** The top and bottom edges, which move when a body grows or shrinks. */
  vertK: number;
  vertZ: number;
  /** Past this many times its width, the back of the body is pulled along. */
  maxStretch: number;
  /** How hard the back is pulled, and how much the front is held back. */
  tetherK: number;
  tetherDrag: number;
  /** Soft walls (see `setBounds`): the body squashes against them. */
  wallK: number;
  wallZ: number;
  /** Each surface particle's wobble. Low damping is jiggly. */
  surfK: number;
  surfZ: number;
  /** The share of the goal's acceleration the surface feels. */
  inertia: number;
  /** Jelly piling up at the back when accelerating. */
  slosh: number;
  /** Keeps the area constant, so a squashed end bulges. */
  pressure: number;
  /** Couples neighbouring particles, so ripples travel round the surface. */
  smooth: number;
  /** The furthest a particle may stray from the goal shape, in px. */
  maxDisp: number;
  /** Volume: thinner when stretched, fatter when squashed, within these limits. */
  volumeExp: number;
  volumeMin: number;
  volumeMax: number;
  /** The squish when pressed in place. */
  pokeK: number;
  pokeZ: number;
  pokeWiden: number;
  pokeFlatten: number;
  /** Idle waves round the surface, in px. A body with 0 sleeps once it settles. */
  breathe: number;
  /** How far the surface reaches toward a nearby pointer, and from how far away. */
  hoverReach: number;
  hoverRadius: number;
}

/** The tunings proven in the spike. Each body gets its own copy. */
export const DEFAULT_PARAMS: Readonly<JellyParams> = Object.freeze({
  leadK: 420,
  leadZ: 0.68,
  trailK: 230,
  trailZ: 0.7,
  trailDelay: 0.055,
  settleK: 380,
  settleZ: 0.62,
  pressK: 520,
  pressZ: 0.5,
  pressReach: 0.24,
  pressMaxReach: 30,
  vertK: 300,
  vertZ: 0.62,
  maxStretch: 1.6,
  tetherK: 1400,
  tetherDrag: 0.3,
  wallK: 5000,
  wallZ: 0.9,
  surfK: 650,
  surfZ: 0.09,
  inertia: 0.05,
  slosh: 0.045,
  pressure: 900,
  smooth: 2200,
  maxDisp: 9,
  volumeExp: 0.4,
  volumeMin: 0.76,
  volumeMax: 1.14,
  pokeK: 700,
  pokeZ: 0.28,
  pokeWiden: 3.5,
  pokeFlatten: 0.13,
  breathe: 0.5,
  hoverReach: 3,
  hoverRadius: 46,
});
