import { PopoverDescription as PopoverDescriptionPart } from '@ui-sdk/react/popover';
import type { ComponentPropsWithRef, CSSProperties, JSX } from 'react';

import { classNames } from '#internal/class-names';

export interface PopoverDescriptionProps extends Omit<ComponentPropsWithRef<'p'>, 'dir'> {
  readonly id?: string;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/** Describes the popover, and is read when focus moves in. A paragraph. */
export function PopoverDescription({ className, ...props }: PopoverDescriptionProps): JSX.Element {
  return <PopoverDescriptionPart {...props} className={classNames('agar-popover-description', className)} />;
}
