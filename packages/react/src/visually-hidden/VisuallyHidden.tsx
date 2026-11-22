import type { ComponentPropsWithRef, JSX } from 'react';

export type VisuallyHiddenProps = ComponentPropsWithRef<'span'>;

/**
 * Hides content visually while keeping it available to screen readers. Use it
 * for labels on icon-only controls, or extra context a sighted user gets from
 * layout.
 */
export function VisuallyHidden({ className, ...props }: VisuallyHiddenProps): JSX.Element {
  const classes = className === undefined ? 'agar-visually-hidden' : `agar-visually-hidden ${className}`;
  return <span className={classes} {...props} />;
}
