import { PopoverTitle as PopoverTitlePart } from '@ui-sdk/react/popover';
import type { ComponentPropsWithRef, CSSProperties, JSX } from 'react';

import { classNames } from '#internal/class-names';

export interface PopoverTitleProps extends Omit<ComponentPropsWithRef<'h2'>, 'dir'> {
  readonly id?: string;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/** Names the popover. A level 2 heading. */
export function PopoverTitle({ className, ...props }: PopoverTitleProps): JSX.Element {
  return <PopoverTitlePart {...props} className={classNames('agar-popover-title', className)} />;
}
