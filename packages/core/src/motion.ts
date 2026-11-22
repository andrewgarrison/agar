/** True when the user has asked the OS for reduced motion. Safe to call during SSR. */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
