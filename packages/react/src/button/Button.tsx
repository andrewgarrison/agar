import { Button as ButtonRoot } from '@ui-sdk/react/button';
import type { ComponentPropsWithRef, CSSProperties, JSX, MouseEvent, ReactNode } from 'react';
import { useMemo, useRef } from 'react';

import { classNames } from '#internal/class-names';
import { useMergedRef } from '#internal/refs';

import { useButtonJelly } from './use-button-jelly';

type NativeProps = Omit<ComponentPropsWithRef<'button'>, 'children' | 'disabled' | 'onClick' | 'type'>;

export interface ButtonProps extends NativeProps {
  /**
   * Runs when the button is pressed. Return a Promise to keep it pending
   * until the Promise settles: it says it's busy, keeps focus, ignores
   * presses meanwhile, and announces `pendingAnnouncement` after a second.
   */
  readonly onClick?: (event: MouseEvent<HTMLElement>) => unknown;
  /** `submit` submits its form and `reset` resets it. Defaults to `button`, which does neither. */
  readonly type?: 'button' | 'submit' | 'reset';
  /** Stops presses, and takes it out of the tab order unless `focusableWhenDisabled` is set. */
  readonly disabled?: boolean;
  /** Keeps a disabled button focusable, with `aria-disabled`, so it can say why it's unavailable. */
  readonly focusableWhenDisabled?: boolean;
  /** What screen readers hear once it has been pending for a second. Defaults to "Loading"; `""` says nothing. */
  readonly pendingAnnouncement?: string;
  readonly id?: string;
  readonly className?: string;
  readonly style?: CSSProperties;
  /**
   * The label, and any icons. Mark content `data-show="idle"` or
   * `data-show="pending"` to show it only in that state.
   */
  readonly children?: ReactNode;
}

/** A button that runs an action: jelly glass that frosts what's behind it and squishes when it's pressed. */
export function Button({
  children,
  className,
  ref,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  onKeyDown,
  onKeyUp,
  onBlur,
  ...props
}: ButtonProps): JSX.Element {
  const rootRef = useRef<HTMLButtonElement>(null);
  const glassRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const refs = useMemo(() => ({ root: rootRef, glass: glassRef, canvas: canvasRef }), []);
  const handlers = useButtonJelly(refs, {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
    onKeyDown,
    onKeyUp,
    onBlur,
  });
  return (
    <ButtonRoot
      {...props}
      {...handlers}
      ref={useMergedRef(rootRef, ref)}
      className={classNames('agar-button', className)}
    >
      <span ref={glassRef} aria-hidden="true" className="agar-button-glass" />
      <canvas ref={canvasRef} aria-hidden="true" className="agar-jelly-canvas" />
      <span className="agar-button-label">{children}</span>
    </ButtonRoot>
  );
}
