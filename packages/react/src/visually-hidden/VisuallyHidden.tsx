import type { ComponentPropsWithRef, JSX } from 'react';

export interface VisuallyHiddenProps extends ComponentPropsWithRef<'span'> {}

/**
 * Hides content visually while keeping it available to screen readers. Use it
 * for labels on icon-only controls, or extra context a sighted user gets from
 * layout.
 */
export function VisuallyHidden({ className, ...props }: VisuallyHiddenProps): JSX.Element {
  return <span className={className ? `agar-visually-hidden ${className}` : 'agar-visually-hidden'} {...props} />;
}
