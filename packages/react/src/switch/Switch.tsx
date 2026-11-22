import { Switch as SwitchRoot } from '@ui-sdk/react/switch';
import type { ComponentPropsWithRef, CSSProperties, JSX, ReactNode } from 'react';
import { useMemo, useRef } from 'react';

import { classNames } from '#internal/class-names';
import { useMergedRef } from '#internal/refs';

import { ThumbContext } from './context';
import { SwitchThumb } from './SwitchThumb';
import { useSwitchJelly } from './use-switch-jelly';

/** Why a switch turned on or off. */
export type SwitchChangeReason = 'press' | 'reset' | 'restore' | 'imperative';

export interface SwitchChangeDetails {
  /** `press` for a click, tap or Space; `reset` for a form reset; `restore` when the browser restores state. */
  readonly reason: SwitchChangeReason;
  /** The DOM event behind the change, when there is one. */
  readonly event?: Event | undefined;
  /** Keeps the current value. A controlled switch ignores it, since its value comes from you. */
  readonly cancel: () => void;
}

type ButtonProps = Omit<
  ComponentPropsWithRef<'button'>,
  'children' | 'defaultChecked' | 'defaultValue' | 'form' | 'name' | 'onChange' | 'onSelect' | 'type' | 'value'
>;

export interface SwitchProps extends ButtonProps {
  /** Whether it's on. Pass it with `onCheckedChange` to control the switch. */
  readonly checked?: boolean;
  /** Whether it's on at first, when uncontrolled. A form reset returns to it. */
  readonly defaultChecked?: boolean;
  /** Runs when a user or a form reset turns it on or off. */
  readonly onCheckedChange?: (checked: boolean, details: SwitchChangeDetails) => void;
  /** Stops focus and changes, and leaves it out of form submissions. */
  readonly disabled?: boolean;
  /** Keeps it focusable and submitted, but stops changes. */
  readonly readOnly?: boolean;
  /** Blocks form submission until it's on. */
  readonly required?: boolean;
  /** The name it submits under. Without one, it submits nothing. */
  readonly name?: string;
  /** What it submits while on. Defaults to `"on"`. */
  readonly value?: string;
  /** The id of a form to join, when the switch isn't inside it. */
  readonly form?: string;
  readonly id?: string;
  readonly className?: string;
  readonly style?: CSSProperties;
  /** The thumb. Defaults to `<SwitchThumb />`. */
  readonly children?: ReactNode;
}

/**
 * A control that turns a setting on or off, with a jelly thumb. Put it in a
 * `<label>` with text that names the setting, and keep that text the same in
 * both states.
 */
export function Switch({
  children,
  className,
  ref,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  ...props
}: SwitchProps): JSX.Element {
  const rootRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const refs = useMemo(() => ({ root: rootRef, canvas: canvasRef, thumb: thumbRef }), []);
  const handlers = useSwitchJelly(refs, { onPointerDown, onPointerMove, onPointerUp, onPointerLeave, onPointerCancel });
  return (
    <ThumbContext value={thumbRef}>
      <SwitchRoot
        {...props}
        {...handlers}
        ref={useMergedRef(rootRef, ref)}
        className={classNames('agar-switch', className)}
      >
        <canvas ref={canvasRef} aria-hidden="true" className="agar-jelly-canvas" />
        {children ?? <SwitchThumb />}
      </SwitchRoot>
    </ThumbContext>
  );
}
