/**
 * @agar/core: the jelly engine (physics, shared renderer, animation stage) and
 * design tokens. Pure TypeScript, no React, no UI SDK.
 *
 * Phase 0 placeholder. The engine moves here from `seed/` in Phase 1.
 */

/** True when the user has asked the OS for reduced motion. Safe to call during SSR. */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
