// Evenly spaced points round a rounded rectangle.

/** A point on a shape's outline and its outward unit normal. */
export interface SurfacePoint {
  x: number;
  y: number;
  nx: number;
  ny: number;
}

export interface RoundedRect {
  centerX: number;
  centerY: number;
  halfWidth: number;
  halfHeight: number;
  /** Corner radius. Must be at least 1 and at most the smaller half-size. */
  radius: number;
}

// One stretch of the outline. A line (radius 0) starts at the origin and runs
// clockwise; an arc is centred on it. Either way `angle` is the outward normal
// where the segment starts, and an arc's normal turns with it.
interface Segment {
  originX: number;
  originY: number;
  angle: number;
  radius: number;
  length: number;
}

const QUARTER: number = Math.PI / 2;

// Clockwise on screen (y down) from the top centre.
function segments({ centerX: cx, centerY: cy, halfWidth: hw, halfHeight: hh, radius }: RoundedRect): Segment[] {
  const sx = hw - radius;
  const sy = hh - radius;
  const arc = QUARTER * radius;
  return [
    { originX: cx, originY: cy - hh, angle: -QUARTER, radius: 0, length: sx },
    { originX: cx + sx, originY: cy - sy, angle: -QUARTER, radius, length: arc },
    { originX: cx + hw, originY: cy - sy, angle: 0, radius: 0, length: 2 * sy },
    { originX: cx + sx, originY: cy + sy, angle: 0, radius, length: arc },
    { originX: cx + sx, originY: cy + hh, angle: QUARTER, radius: 0, length: 2 * sx },
    { originX: cx - sx, originY: cy + sy, angle: QUARTER, radius, length: arc },
    { originX: cx - hw, originY: cy + sy, angle: Math.PI, radius: 0, length: 2 * sy },
    { originX: cx - sx, originY: cy - sy, angle: Math.PI, radius, length: arc },
    { originX: cx - sx, originY: cy - hh, angle: -QUARTER, radius: 0, length: sx },
  ];
}

function place(segment: Segment, distance: number, out: SurfacePoint): void {
  const isArc = segment.radius > 0;
  const angle = segment.angle + (isArc ? distance / segment.radius : 0);
  const run = isArc ? 0 : distance;
  out.nx = Math.cos(angle);
  out.ny = Math.sin(angle);
  // A line runs along its normal turned a quarter clockwise: (-ny, nx).
  out.x = segment.originX + segment.radius * out.nx - run * out.ny;
  out.y = segment.originY + segment.radius * out.ny + run * out.nx;
}

function placeAlong(path: readonly Segment[], distance: number, out: SurfacePoint): void {
  let rest = distance;
  for (const segment of path) {
    if (rest <= segment.length) {
      place(segment, rest, out);
      return;
    }
    rest -= segment.length;
  }
}

/** Writes `points.length` evenly spaced points round `rect`, clockwise on screen from the top centre. */
export function traceRoundedRect(rect: RoundedRect, points: readonly SurfacePoint[]): void {
  const path = segments(rect);
  const perimeter = path.reduce((sum, segment) => sum + segment.length, 0);
  for (const [index, point] of points.entries()) {
    placeAlong(path, (index / points.length) * perimeter, point);
  }
}
