// The ring of particles round a body. Each one wants to sit on the goal shape
// but has its own wobbly spring, a little inertia, pressure that keeps the
// area constant, and a slosh force, so the surface ripples and settles like
// real jelly instead of tweening between fixed shapes.

import type { JellyParams } from './params';
import { Particle } from './particle';
import type { SurfacePoint } from './shape';
import { dampingFor } from './spring';

// Ignore goal accelerations above this (px/s²): one-frame spikes, like a resize.
const MAX_ACCELERATION = 2e5;
const STILL_VELOCITY = 0.02;

function clamp(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}

/** What a step of the ring needs to know about the goal shape. */
export interface RingFrame {
  params: Readonly<JellyParams>;
  /** 0 under reduced motion, which turns off inertia, slosh and pressure. */
  motion: number;
  centerX: number;
  halfWidth: number;
  dt: number;
}

// Slosh: accelerating right bulges the left side and thins the right.
function slosh(particle: Particle, frame: RingFrame, ax: number): number {
  const across = frame.halfWidth > 0 ? (particle.goal.x - frame.centerX) / frame.halfWidth : 0;
  return ax * across * frame.params.slosh * frame.motion;
}

// Neighbour coupling (a discrete Laplacian), so ripples travel round the ring.
function spreadAt({ previous, next, offsetX, offsetY }: Particle): { x: number; y: number } {
  return { x: (previous.offsetX + next.offsetX) / 2 - offsetX, y: (previous.offsetY + next.offsetY) / 2 - offsetY };
}

interface Acceleration {
  ax: number;
  ay: number;
}

export class SurfaceRing {
  public readonly particles: readonly Particle[];
  /** The goal shape's points, for `traceRoundedRect` to write into. */
  public readonly goals: readonly SurfacePoint[];
  private hasGoal = false;

  public constructor(count: number) {
    const particles = Array.from({ length: count }, () => new Particle());
    for (const [index, particle] of particles.entries()) {
      particle.next = particles[(index + 1) % count] ?? particle;
      particle.next.previous = particle;
    }
    this.particles = particles;
    this.goals = particles.map((particle) => particle.goal);
  }

  /** Drops all wobble, so the ring sits exactly on the goal shape. */
  public reset(): void {
    for (const particle of this.particles) {
      particle.reset();
    }
    this.hasGoal = false;
  }

  public isStill(): boolean {
    return this.particles.every(
      (particle) => Math.abs(particle.velocityX) <= STILL_VELOCITY && Math.abs(particle.velocityY) <= STILL_VELOCITY,
    );
  }

  /** Steps every particle, then writes the ring's points (x and y interleaved) into `out`. */
  public step(frame: RingFrame, out: Float32Array): void {
    const pressure = this.pressure(frame);
    for (const particle of this.particles) {
      this.push(particle, frame, pressure);
    }
    this.move(frame, out);
    if (!this.hasGoal) {
      // The first step has no goal velocity to difference against.
      for (const particle of this.particles) {
        particle.goalVelocityX = 0;
        particle.goalVelocityY = 0;
      }
      this.hasGoal = true;
    }
  }

  // An outward push along each normal that restores the goal shape's area.
  private pressure(frame: RingFrame): number {
    let area = 0;
    let goalArea = 0;
    let perimeter = 0;
    for (const particle of this.particles) {
      const { previous } = particle;
      area += previous.x * particle.y - particle.x * previous.y;
      goalArea += previous.goal.x * particle.goal.y - particle.goal.x * previous.goal.y;
      perimeter += Math.hypot(particle.x - previous.x, particle.y - previous.y);
    }
    // The ring runs clockwise on screen (y down), so the shoelace sums are positive.
    return (frame.motion * frame.params.pressure * ((goalArea - area) / 2)) / Math.max(perimeter, 1);
  }

  // The goal's acceleration at this particle, from finite differences over the step.
  private acceleration(particle: Particle, dt: number): Acceleration {
    if (!this.hasGoal) {
      return { ax: 0, ay: 0 };
    }
    const velocityX = (particle.goal.x - particle.lastX) / dt;
    const velocityY = (particle.goal.y - particle.lastY) / dt;
    const ax = (velocityX - particle.goalVelocityX) / dt;
    const ay = (velocityY - particle.goalVelocityY) / dt;
    particle.goalVelocityX = velocityX;
    particle.goalVelocityY = velocityY;
    return { ax: clamp(ax, MAX_ACCELERATION), ay: clamp(ay, MAX_ACCELERATION) };
  }

  private push(particle: Particle, frame: RingFrame, pressure: number): void {
    const { params, motion, dt } = frame;
    const { ax, ay } = this.acceleration(particle, dt);
    const damping = dampingFor(params.surfK, params.surfZ);
    const outward = pressure - slosh(particle, frame, ax);
    const spread = spreadAt(particle);
    const forceX = params.smooth * spread.x + particle.goal.nx * outward - ax * params.inertia * motion;
    const forceY = params.smooth * spread.y + particle.goal.ny * outward - ay * params.inertia * motion;
    particle.velocityX += (forceX - params.surfK * particle.offsetX - damping * particle.velocityX) * dt;
    particle.velocityY += (forceY - params.surfK * particle.offsetY - damping * particle.velocityY) * dt;
  }

  private move(frame: RingFrame, out: Float32Array): void {
    const limit = frame.params.maxDisp;
    for (const [index, particle] of this.particles.entries()) {
      particle.offsetX = clamp(particle.offsetX + particle.velocityX * frame.dt, limit);
      particle.offsetY = clamp(particle.offsetY + particle.velocityY * frame.dt, limit);
      particle.lastX = particle.goal.x;
      particle.lastY = particle.goal.y;
      out[index * 2] = particle.x;
      out[index * 2 + 1] = particle.y;
    }
  }
}
