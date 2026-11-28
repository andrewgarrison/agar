// The stage: one animation loop for every jelly surface on the page.
//
// A surface is a 2D canvas a component owns, plus the bodies drawn on it. The
// stage steps every awake body on a fixed physics step, draws each awake
// surface through the shared renderer, and stops the loop entirely once
// everything is asleep, off screen, or the tab is hidden.

import type { JellyBody } from './body';
import { cursor, followCursor } from './cursor';
import type { CursorLight, DrawItem, DrawTarget } from './draw-target';
import { Loop } from './loop';
import type { JellyPalette } from './palettes';
import { STEP } from './params';
import { drawSurface, rendererWarmUps } from './renderer';

const MAX_DPR = 2;
const DEFAULT_MARGIN = 12;
// The cursor light turns in and out at this rate (per second, eased), and
// counts as there once this close.
const LIGHT_RATE = 6;
const LIGHT_SNAP = 0.002;

// Made on first use, so importing the stage has no side effects and works during SSR.
const stage: { loop: Loop | null } = { loop: null };

function getLoop(): Loop {
  stage.loop ??= new Loop(rendererWarmUps);
  return stage.loop;
}

/** The number of surfaces on the page. */
export function surfaceCount(): number {
  return stage.loop?.surfaces.size ?? 0;
}

export class JellySurface {
  public readonly canvas: HTMLCanvasElement;
  /** False once every body is asleep. Call `wake` after changing any body. */
  public awake = true;
  /** False while the canvas is scrolled out of view. */
  public onScreen = true;
  /** Runs after each draw, with the bodies where they were drawn: follow their outlines here. */
  public onDraw: (() => void) | null = null;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly margin: number;
  private readonly observer: IntersectionObserver | null = null;
  private items: DrawItem[] = [];
  private dpr = 1;
  // How far the rim light has turned to the cursor, for lens bodies.
  private lightMix = 0;
  private unfollow: (() => void) | null = null;

  /**
   * @param canvas absolutely positioned inside the container it measures from
   * @param margin px the canvas reaches past the container, so wobbles and the shadow aren't clipped
   */
  public constructor(canvas: HTMLCanvasElement, margin: number = DEFAULT_MARGIN) {
    const ctx = canvas.getContext('2d');
    if (ctx === null) {
      throw new Error('Jelly: a surface needs a canvas with a 2D context');
    }
    this.canvas = canvas;
    this.ctx = ctx;
    this.margin = margin;
    getLoop().surfaces.add(this);
    if (typeof IntersectionObserver === 'function') {
      // One callback can carry several entries for the canvas, oldest first,
      // when it's hidden and shown again quickly (a popover reopened as it
      // closes). Only the last one is current.
      this.observer = new IntersectionObserver((entries) => {
        this.onScreen = entries.at(-1)?.isIntersecting ?? true;
        if (this.onScreen) {
          this.wake();
        }
      });
      this.observer.observe(canvas);
    }
  }

  /** Matches the container's size, in CSS px. Call it from a ResizeObserver. */
  public resize(width: number, height: number): void {
    const { margin } = this;
    this.dpr = Math.min(globalThis.devicePixelRatio || 1, MAX_DPR);
    const cssWidth = width + margin * 2;
    const cssHeight = height + margin * 2;
    this.canvas.width = Math.max(1, Math.round(cssWidth * this.dpr));
    this.canvas.height = Math.max(1, Math.round(cssHeight * this.dpr));
    Object.assign(this.canvas.style, {
      width: `${cssWidth}px`,
      height: `${cssHeight}px`,
      left: `${-margin}px`,
      top: `${-margin}px`,
    });
    this.wake();
  }

  public add(body: JellyBody, palette: Readonly<JellyPalette>): void {
    this.items.push({ body, palette });
    this.follow();
    this.wake();
  }

  public remove(body: JellyBody): void {
    this.items = this.items.filter((item) => item.body !== body);
    this.wake();
  }

  public setPalette(body: JellyBody, palette: Readonly<JellyPalette>): void {
    const item = this.items.find((each) => each.body === body);
    if (item !== undefined) {
      item.palette = palette;
    }
    this.follow();
    this.wake();
  }

  /** Starts the loop again. Call it after changing any body's goals. */
  public wake(): void {
    this.awake = true;
    getLoop().wake();
  }

  /** Steps every body `steps` times, then draws. The loop calls this each frame. */
  public tick(steps: number): void {
    for (const { body } of this.items) {
      for (let count = 0; count < steps; count += 1) {
        body.step(STEP);
      }
    }
    const target: DrawTarget = {
      ctx: this.ctx,
      width: this.canvas.width,
      height: this.canvas.height,
      dpr: this.dpr,
      origin: { x: -this.margin, y: -this.margin },
    };
    const turning = this.unfollow !== null && this.turnLight(steps * STEP);
    if (this.unfollow !== null) {
      target.light = this.cursorLight();
    }
    drawSurface(target, this.items);
    this.onDraw?.();
    this.awake = turning || this.items.some(({ body }) => !body.isAsleep());
  }

  public destroy(): void {
    stage.loop?.surfaces.delete(this);
    this.observer?.disconnect();
    this.unfollow?.();
    this.unfollow = null;
    this.items = [];
  }

  // Lens bodies light their rim toward the cursor: follow it while there are any.
  private follow(): void {
    const lens = this.items.some(({ palette }) => palette.lens);
    if (lens && this.unfollow === null) {
      this.unfollow = followCursor(() => {
        this.wake();
      });
    } else if (!lens && this.unfollow !== null) {
      this.unfollow();
      this.unfollow = null;
    }
  }

  // Eases the light toward the cursor while it's on the page, and away once it
  // leaves. True while it's still turning.
  private turnLight(seconds: number): boolean {
    const goal = cursor().active ? 1 : 0;
    this.lightMix += (goal - this.lightMix) * Math.min(1, seconds * LIGHT_RATE);
    if (Math.abs(this.lightMix - goal) < LIGHT_SNAP) {
      this.lightMix = goal;
    }
    return this.lightMix !== goal;
  }

  // The cursor in surface space: the canvas's top-left is at -margin.
  private cursorLight(): CursorLight {
    const { x, y } = cursor();
    const box = this.canvas.getBoundingClientRect();
    return { x: x - box.left - this.margin, y: y - box.top - this.margin, mix: this.lightMix };
  }
}
