import { PopoverTrigger as PopoverTriggerPart } from '@ui-sdk/react/popover';
import type { ComponentPropsWithRef, CSSProperties, JSX } from 'react';
import { use } from 'react';

import { classNames } from '#internal/class-names';
import { useMergedRef } from '#internal/refs';

import { TriggerContext } from './context';

export interface PopoverTriggerProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'defaultValue' | 'dir' | 'onChange' | 'type' | 'value'
> {
  /** Stops it opening the popover. */
  readonly disabled?: boolean;
  /** Keeps a disabled trigger focusable, with `aria-disabled`, so it can say why. */
  readonly focusableWhenDisabled?: boolean;
  readonly id?: string;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/** The button that opens and closes the popover. */
export function PopoverTrigger({ className, ref, ...props }: PopoverTriggerProps): JSX.Element {
  const triggerRef = use(TriggerContext);
  if (triggerRef === null) {
    throw new Error('Agar: <PopoverTrigger> must be inside a <Popover>.');
  }
  return (
    <PopoverTriggerPart
      {...props}
      ref={useMergedRef(triggerRef, ref)}
      className={classNames('agar-popover-trigger', className)}
    />
  );
}
