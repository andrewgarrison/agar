// The jelly shaders. One full-screen triangle; the fragment shader draws a
// body's ring as a signed distance field rounded by ROUND px, with a bevelled
// normal for the highlight, a rim, an inner glow, a stroke and a soft drop
// shadow. It outputs premultiplied alpha.

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
out vec4 outColor;

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
