// The Canvas 2D fallback, for browsers without WebGL2: a flat fill in the
// palette's top colour, rounded by stroking ROUND px round the ring.

import type { DrawItem, DrawTarget } from './draw-target';
import { growCanvas, isVisible } from './draw-target';
import { ROUND } from './params';

const CHANNEL = 255;

function trace(scratch: CanvasRenderingContext2D, { width, height, dpr, origin }: DrawTarget, pts: Float32Array): void {
  scratch.setTransform(1, 0, 0, 1, 0, 0);
  scratch.clearRect(0, 0, width, height);
  scratch.setTransform(dpr, 0, 0, dpr, -origin.x * dpr, -origin.y * dpr);
  scratch.beginPath();
  for (let index = 0; index < pts.length; index += 2) {
    scratch.lineTo(pts[index] ?? 0, pts[index + 1] ?? 0);
  }
  scratch.closePath();
}

function paint(scratch: CanvasRenderingContext2D, color: string): void {
  scratch.fillStyle = color;
  scratch.strokeStyle = color;
  scratch.lineJoin = 'round';
  scratch.lineWidth = ROUND * 2;
  scratch.fill();
  scratch.stroke();
}

export class CanvasRenderer {
  private readonly scratch: HTMLCanvasElement = document.createElement('canvas');

  public draw(target: DrawTarget, items: readonly DrawItem[]): void {
    const { ctx, width, height } = target;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    growCanvas(this.scratch, width, height);
    const scratch = this.scratch.getContext('2d');
    if (scratch === null) {
      return;
    }
    for (const item of items) {
      if (isVisible(item.body)) {
        this.drawBody(target, scratch, item);
      }
    }
  }

  private drawBody(target: DrawTarget, scratch: CanvasRenderingContext2D, { body, palette }: DrawItem): void {
    const { ctx, width, height } = target;
    trace(scratch, target, body.pts);
    // The fill and stroke overlap, so draw them opaque and apply the alpha when copying.
    const { red, green, blue, alpha } = palette.tintTop;
    paint(scratch, `rgb(${red * CHANNEL} ${green * CHANNEL} ${blue * CHANNEL})`);
    ctx.globalAlpha = alpha * body.opacity;
    ctx.drawImage(this.scratch, 0, 0, width, height, 0, 0, width, height);
    ctx.globalAlpha = 1;
  }
}
