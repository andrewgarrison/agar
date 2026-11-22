import { SwitchThumb as SwitchThumbPart } from '@ui-sdk/react/switch';
import type { ComponentPropsWithRef, CSSProperties, JSX } from 'react';
import { use } from 'react';

import { classNames } from '#internal/class-names';
import { useMergedRef } from '#internal/refs';

import { ThumbContext } from './context';

export interface SwitchThumbProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  readonly id?: string;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/** The switch's thumb. CSS places it from the switch's state, and the jelly follows it. */
export function SwitchThumb({ className, ref, ...props }: SwitchThumbProps): JSX.Element {
  const thumbRef = use(ThumbContext);
  if (thumbRef === null) {
    throw new Error('Agar: <SwitchThumb> must be inside a <Switch>.');
  }
  return (
    <SwitchThumbPart
      {...props}
      ref={useMergedRef(thumbRef, ref)}
      className={classNames('agar-switch-thumb', className)}
    />
  );
}
