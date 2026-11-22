import type { SurfacePoint } from './shape';

/** One particle of a body's surface ring: an offset from the goal shape, with its own velocity. */
export class Particle {
  /** Where the goal shape wants this particle, written every step. */
  public readonly goal: SurfacePoint = { x: 0, y: 0, nx: 0, ny: -1 };
  public offsetX = 0;
  public offsetY = 0;
  public velocityX = 0;
  public velocityY = 0;
  /** Last step's goal and the goal's velocity, for its acceleration. */
  public lastX = 0;
  public lastY = 0;
  public goalVelocityX = 0;
  public goalVelocityY = 0;
  /** Neighbours round the ring. A lone particle is its own neighbour. */
  public previous: Particle = this;
  public next: Particle = this;

  public get x(): number {
    return this.goal.x + this.offsetX;
  }

  public get y(): number {
    return this.goal.y + this.offsetY;
  }

  public reset(): void {
    this.offsetX = 0;
    this.offsetY = 0;
    this.velocityX = 0;
    this.velocityY = 0;
  }
}
