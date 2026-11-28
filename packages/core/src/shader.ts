// The jelly shaders. One full-screen triangle; the fragment shader draws a
// body's ring as a signed distance field rounded by ROUND px, with a bevelled
// normal for the highlight, a rim, an inner glow, a stroke and a soft drop
// shadow. It outputs premultiplied alpha.
//
// Lens lighting (uLens, for clear glass after bilalgursen/liquid-glass, MIT):
// the glass has no colour of its own, so it only darkens and lights what's
// behind it. A bevel 0.42 of the body's height deep; a cool top reflection
// (uFx.x); a bright line just inside the rim, strongest on the right and left
// at rest and turning toward the cursor when there's one (uFx.y, uLight);
// inner shading in a band inside the rim, deepest at the top and left, and a
// soft ring (uFx.z); a fresnel glow (uFx.w); and a tight drop
// shadow below. Their sizes are in their 120-unit design height, scaled to the
// body's. The darkening is black (blue-tinted at the top) at alpha 1 - M, so
// the page shows through at M; the light is white laid over it. The tint is
// only the Canvas 2D fallback's flat fill.

export const VERTEX_SHADER = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAGMENT_BODY = `precision highp float;
uniform vec2 uPts[N];
uniform vec2 uOrigin;   // surface-space CSS px of the viewport's top-left
uniform float uDpr;
uniform float uHeight;  // viewport height in device px
uniform float uRound;
uniform vec2 uYRange;   // body top and bottom, for the tint gradient
uniform vec4 uTintTop;
uniform vec4 uTintBottom;
uniform vec4 uFx;       // specular, rim, glow, stroke
uniform float uShadow;
uniform float uOpacity;
uniform vec4 uInner;    // left, top, right, bottom of a box inside the ring
uniform float uLens;    // 1: lens lighting, 0: jelly lighting
uniform vec3 uLight;    // lens: the way the cursor is (x, y), and how far the rim has turned to it
out vec4 outColor;

// How far the rim light leans toward the cursor.
const float LEAN = 0.8;

// Signed distance to the ring polygon (after Inigo Quilez), plus the nearest point.
float sdPoly(vec2 p, out vec2 nearest) {
  float d = 1e9;
  float s = 1.0;
  nearest = p;
  for (int i = 0, j = N - 1; i < N; j = i, i++) {
    vec2 a = uPts[i];
    vec2 e = uPts[j] - a;
    vec2 w = p - a;
    vec2 b = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
    float bb = dot(b, b);
    if (bb < d) { d = bb; nearest = p - b; }
    bvec3 c = bvec3(p.y >= a.y, p.y < uPts[j].y, e.x * w.y > e.y * w.x);
    if (all(c) || all(not(c))) s = -s;
  }
  return s * sqrt(d);
}

vec4 over(vec4 top, vec4 bottom) { return top + bottom * (1.0 - top.a); }

// Darkening in linear light, as a factor on sRGB values.
float dimmed(float k) { return pow(clamp(k, 0.0, 1.0), 1.0 / 2.2); }

float bevelHeight(float d, float bevel) {
  float t = pow(clamp(-d / bevel, 0.0, 1.0), 1.0 / 1.4);
  return sqrt(max(0.0, 1.0 - (1.0 - t) * (1.0 - t)));
}

vec4 lensShadow(vec2 p, float d, float unit, float ny) {
  vec2 nearestS;
  float near = 1.0 - smoothstep(-6.0, 20.4 * unit, sdPoly(p - vec2(0.0, 11.0 * unit), nearestS) - uRound);
  float far = 1.0 - smoothstep(-10.0, 30.6 * unit, sdPoly(p - vec2(0.0, 17.6 * unit), nearestS) - uRound);
  float fade = smoothstep(-0.1, 0.9, ny) * 0.92 + 0.08;
  float sh = clamp((near + far) * uShadow * fade * smoothstep(-4.0, 14.0, d), 0.0, 0.85);
  return vec4(0.0, 0.0, 0.0, 1.0 - dimmed(1.0 - sh));
}

// The outward direction and the distance to the ring, both blended across
// neighbouring edges so the lighting curves smoothly: inside a polygon every
// pixel's nearest point is on one edge, so the plain direction steps from edge
// to edge (facets round the ends), and where the wobbling ring bends inward the
// plain distance has creases. Near the polygon itself the blend picks up the
// neighbouring edges side-on and wobbles, so it fades in from 2 to 10 px
// inside the polygon; outside it the plain direction already fans smoothly.
struct Soft { vec2 dir; float d; };

Soft soften(vec2 p, float d, vec2 nearest) {
  const float S = 2.5;
  float dmin = abs(d + uRound);
  vec2 sum = vec2(0.0);
  float total = 0.0;
  for (int i = 0, j = N - 1; i < N; j = i, i++) {
    vec2 e = uPts[j] - uPts[i];
    vec2 w = p - uPts[i];
    vec2 b = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
    float len = length(b);
    float k = exp(-(len - dmin) / S);
    total += k;
    if (len > 1e-4) sum += b / len * k;
  }
  float len = length(sum);
  float side = sign(d + uRound);
  vec2 plain = p - nearest;
  float plainLen = length(plain);
  plain = plainLen > 1e-4 ? plain / plainLen * side : vec2(0.0, -1.0);
  vec2 soft = len > 1e-4 ? sum / len * side : plain;
  float t = smoothstep(2.0, 10.0, -(d + uRound));
  return Soft(normalize(mix(plain, soft, t) + vec2(0.0, -1e-5)), d - t * S * log(max(total, 1.0)));
}

vec4 lens(vec2 p, float d, vec2 nearest, float cover) {
  float bodyH = max(uYRange.y - uYRange.x, 1.0);
  float unit = bodyH / 120.0;
  float bevel = 50.4 * unit;
  float ly = p.y - (uYRange.x + uYRange.y) * 0.5;
  float ny = ly / (bodyH * 0.5);
  vec4 col = d > -4.0 ? lensShadow(p, d, unit, ny) : vec4(0.0);
  if (d >= 1.0 / uDpr) return col;

  // Outward, whichever side of the ring the pixel is on.
  Soft soft = soften(p, d, nearest);
  vec2 dir = soft.dir;
  float up = max(-dir.y, 0.0);
  float down = max(dir.y, 0.0);
  float left = max(-dir.x, 0.0);
  float right = max(dir.x, 0.0);

  // The top reflection dims what shows through, less in blue: about 10%
  // in the middle, more at the top, almost nothing at the bottom.
  float top = ((1.0 - smoothstep(-0.05, 0.75, ny)) * 0.6 + 0.067) * uFx.x;
  float m = dimmed(1.0 - top);
  float mBlue = dimmed(1.0 - 0.72 * top);
  float inner = uFx.z;
  float band = smoothstep(-0.19 * bevel, -0.024 * bevel, d);
  float shade = dimmed(1.0 - band * (up + left * 0.6 + right * 0.3 + down * 0.15) * inner * 2.2);
  shade *= dimmed(1.0 - smoothstep(-0.73 * bevel, -0.13 * bevel, soft.d) * left * inner * 2.0);
  float hx = (soft.d + 0.45 * bevel) / (0.26 * bevel);
  shade *= dimmed(1.0 - exp(-hx * hx) * (right * 0.9 + up * 0.5 + left * 0.4 + down * 0.3) * inner * 1.5);
  m *= shade;
  mBlue *= shade;
  float dark = 1.0 - m;
  vec4 body = vec4(0.0, 0.0, dark > 1e-4 ? clamp((mBlue - m) / dark, 0.0, 1.0) * dark : 0.0, dark);

  // Rim light and fresnel, white; the left of the rim catches less.
  float slope = (bevelHeight(d + 1.25, bevel) - bevelHeight(d, bevel)) / 1.25;
  vec3 n = normalize(vec3(-42.0 * slope * dir, 1.0));
  float fresnel = pow(clamp(1.0 - n.z, 0.0, 1.0), 6.0);
  float rimW = max(1.1 / uDpr, 1.0);
  float rimLine = 1.0 - smoothstep(0.0, rimW * 1.6, abs(d + rimW * 1.8));
  float fall = exp(-(ly / 30.0) * (ly / 30.0));
  float studio = right * right * fall * 0.9 + down * down * 0.75 + left * left * 0.6;
  // With a cursor on the page the rim leans toward it: brightest where it
  // faces the cursor, less on the far side.
  float facing = max(dot(dir, uLight.xy), 0.0);
  float away = max(-dot(dir, uLight.xy), 0.0);
  float lean = uLight.z * LEAN;
  studio = mix(studio, facing * facing * 0.9 + away * away * 0.55, lean);
  float front = mix(right, facing, lean);
  float back = mix(left, away, lean);
  float light = (rimLine * studio * uFx.y + fresnel * front * uFx.w) * mix(1.0, 0.6, back * 0.85);
  light = clamp(light, 0.0, 1.0);
  body = over(vec4(vec3(light), light), body);
  return over(body * cover, col);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uHeight - gl_FragCoord.y) / uDpr + uOrigin;

  // Inside the ring the jelly is flat (no bevel, rim, glow, stroke or
  // shadow reach that far), so a pixel in the inner box skips the ring walk.
  vec2 nearest = p;
  float d = -uRound;
  if (p.x <= uInner.x || p.x >= uInner.z || p.y <= uInner.y || p.y >= uInner.w) {
    d = sdPoly(p, nearest) - uRound;
  }
  float px = 1.0 / uDpr;
  float cover = smoothstep(px, -px, d);
  if (uLens > 0.5) {
    outColor = lens(p, d, nearest, cover) * uOpacity;
    return;
  }

  // Soft drop shadow, mostly outside the body. Deeper than 4px inside, the
  // body hides it completely, so skip the second ring walk there.
  vec4 col = vec4(0.0);
  float under = smoothstep(-4.0, 1.0, d);
  if (under > 0.0) {
    vec2 nearestS;
    float ds = sdPoly(p - vec2(0.0, 2.5), nearestS) - uRound;
    col.a = (1.0 - smoothstep(-2.0, 5.0, ds)) * under * uShadow;
  }

  if (d < px) {
    // Bevel: a quarter circle uRound px wide round the edge, flat inside.
    float q = clamp(-d / uRound, 0.0, 1.0);
    vec2 dir = p - nearest;
    float len = length(dir);
    dir = len > 1e-4 ? dir / len : vec2(0.0);
    float inner = 1.0 - q;
    vec3 n = normalize(vec3(dir * inner, sqrt(max(0.0, 1.0 - inner * inner))));

    vec3 L = normalize(vec3(-0.35, -0.85, 0.55)); // screen y points down
    vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
    float spec = pow(max(dot(n, H), 0.0), 42.0) + 0.18 * pow(max(dot(n, H), 0.0), 6.0);
    float rim = pow(1.0 - n.z, 2.5);
    // Light passing through the jelly gathers on the side away from the light.
    float glow = pow(max(dot(dir, -normalize(L.xy)), 0.0), 1.5) * inner * inner;
    float stroke = smoothstep(1.4, 0.0, abs(d + 0.6)) * (0.55 + 0.45 * max(-dir.y, 0.0));

    float t = clamp((p.y - uYRange.x) / max(uYRange.y - uYRange.x, 1.0), 0.0, 1.0);
    vec4 tint = mix(uTintTop, uTintBottom, t);
    vec4 body = vec4(tint.rgb * tint.a, tint.a);

    float light = clamp(spec * uFx.x + rim * uFx.y + glow * uFx.z + stroke * uFx.w, 0.0, 1.0);
    body = over(vec4(vec3(light), light), body);
    col = over(body * cover, col);
  }

  outColor = col * uOpacity;
}`;

/** The fragment shader, compiled for a ring of `points` particles. */
export function fragmentShader(points: number): string {
  return `#version 300 es\n#define N ${points}\n${FRAGMENT_BODY}`;
}
