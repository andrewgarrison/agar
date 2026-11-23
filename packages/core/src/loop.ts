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
  private readonly warmUps: () => number;

  /**
   * @param warmUps counts the renderer's one-off work (see `rendererWarmUps`).
   * A frame that does some restarts the clock after it, so the next frame
   * doesn't simulate it.
   */
  public constructor(warmUps: () => number = (): number => 0) {
    this.warmUps = warmUps;
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
  // A frame's timestamp is when the frame began, so it can be a little before
  // a `wake` or a warm-up that ended during that frame: never count backwards.
  private stepsUntil(now: number): number {
    this.pending += Math.min(Math.max(now - this.last, 0) / MS_PER_SECOND, MAX_FRAME);
    this.last = now;
    const steps = Math.floor(this.pending / STEP);
    this.pending -= steps * STEP;
    return steps;
  }

  // Ticks every awake, on-screen surface. True when any is still awake.
  private tickAll(steps: number): boolean {
    let anyAwake = false;
    for (const surface of this.surfaces) {
      if (surface.awake && surface.onScreen) {
        surface.tick(steps);
        anyAwake ||= surface.awake;
      }
    }
    return anyAwake;
  }

  private readonly frame = (now: number): void => {
    this.frameId = 0;
    const steps = this.stepsUntil(now);
    const warmUps = this.warmUps();
    const anyAwake = this.tickAll(steps);
    // The renderer just warmed up: a new context, or its first draw call (the
    // shader compile), often a tenth of a second or more. Counting that time
    // would make the next frame jump: a popover opened first on a page showed
    // its jelly already most of the way out of the trigger.
    if (this.warmUps() !== warmUps) {
      this.last = performance.now();
    }
    if (anyAwake) {
      this.frameId = requestAnimationFrame(this.frame);
    }
  };
}
