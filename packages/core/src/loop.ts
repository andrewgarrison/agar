// The one animation loop behind every jelly surface on the page.

import { STEP } from './params';

/** What the loop drives: a surface (see stage.ts). */
export interface Tickable {
  /** False once everything on it is asleep. */
  readonly awake: boolean;
  /** False while it's scrolled out of view. */
  readonly onScreen: boolean;
  tick: (steps: number) => void;
}

// Never simulate more than this many seconds in one frame (after a stall).
// Down to 10 fps the physics keeps real time, in fixed steps, so a slow
// device still finishes on time: the popover's shrink has to end before the
// stylesheet hides the closing panel. A hidden tab stops the loop instead.
const MAX_FRAME = 0.1;
const MS_PER_SECOND = 1000;

export class Loop {
  public readonly surfaces: Set<Tickable> = new Set<Tickable>();
  private frameId = 0;
  private last = 0;
  private pending = 0;

  public constructor() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.wake();
      } else {
        cancelAnimationFrame(this.frameId);
        this.frameId = 0;
      }
    });
  }

  /** Starts the loop if it isn't running. A hidden tab waits until it's visible. */
  public wake(): void {
    if (this.frameId !== 0 || document.visibilityState === 'hidden') {
      return;
    }
    this.last = performance.now();
    this.frameId = requestAnimationFrame(this.frame);
  }

  // Whole physics steps due since the last frame; the remainder carries over.
  private stepsUntil(now: number): number {
    this.pending += Math.min((now - this.last) / MS_PER_SECOND, MAX_FRAME);
    this.last = now;
    const steps = Math.floor(this.pending / STEP);
    this.pending -= steps * STEP;
    return steps;
  }

  private readonly frame = (now: number): void => {
    this.frameId = 0;
    const steps = this.stepsUntil(now);
    let anyAwake = false;
    for (const surface of this.surfaces) {
      if (surface.awake && surface.onScreen) {
        surface.tick(steps);
        anyAwake ||= surface.awake;
      }
    }
    if (anyAwake) {
      this.frameId = requestAnimationFrame(this.frame);
    }
  };
}
