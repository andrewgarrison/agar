// A damped spring on one axis, stepped with semi-implicit Euler.

const STILL = 0.01;

export interface Spring {
  position: number;
  velocity: number;
  goal: number;
  stiffness: number;
  damping: number;
  /** Seconds left before the spring starts moving. */
  delay: number;
}

export function createSpring(): Spring {
  return { position: 0, velocity: 0, goal: 0, stiffness: 0, damping: 0, delay: 0 };
}

/** The damping coefficient for a stiffness and damping ratio (unit mass). */
export function dampingFor(stiffness: number, ratio: number): number {
  return 2 * ratio * Math.sqrt(stiffness);
}

/** Sets a spring's stiffness and damping ratio. */
export function tune(spring: Spring, stiffness: number, ratio: number): void {
  spring.stiffness = stiffness;
  spring.damping = dampingFor(stiffness, ratio);
}

/** Puts a spring at rest at `value`. */
export function jump(spring: Spring, value: number): void {
  spring.position = value;
  spring.goal = value;
  spring.velocity = 0;
  spring.delay = 0;
}

export function stepSpring(spring: Spring, dt: number): void {
  if (spring.delay > 0) {
    spring.delay -= dt;
    return;
  }
  spring.velocity += (spring.stiffness * (spring.goal - spring.position) - spring.damping * spring.velocity) * dt;
  spring.position += spring.velocity * dt;
}

export function isStill(spring: Spring): boolean {
  return Math.abs(spring.velocity) < STILL && Math.abs(spring.goal - spring.position) < STILL;
}
