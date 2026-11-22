import { PopoverClose as PopoverClosePart } from '@ui-sdk/react/popover';
import type { ComponentPropsWithRef, CSSProperties, JSX } from 'react';

import { classNames } from '#internal/class-names';

export interface PopoverCloseProps extends Omit<ComponentPropsWithRef<'button'>, 'dir' | 'type'> {
  readonly disabled?: boolean;
  readonly id?: string;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/** A button that closes the popover and returns focus to the trigger. */
export function PopoverClose({ className, ...props }: PopoverCloseProps): JSX.Element {
  return <PopoverClosePart {...props} className={classNames('agar-popover-close', className)} />;
}
