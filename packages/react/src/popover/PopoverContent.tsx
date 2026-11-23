import { PopoverContent as PopoverContentPart } from '@ui-sdk/react/popover';
import type { ComponentPropsWithRef, CSSProperties, JSX, ReactNode } from 'react';
import { use, useMemo, useRef } from 'react';

import { classNames } from '#internal/class-names';
import { useMergedRef } from '#internal/refs';

import { TriggerContext } from './context';
import { usePopoverJelly } from './use-popover-jelly';

/** Which side of the trigger the popover opens on. `start` and `end` follow the reading direction. */
export type PopoverSide = 'top' | 'bottom' | 'left' | 'right' | 'start' | 'end';

/** How the popover lines up with the trigger along that side. */
export type PopoverAlign = 'start' | 'center' | 'end';

/** Where focus goes on opening: the first focusable element (`auto`), the panel itself, nowhere, or an element. */
export type PopoverInitialFocus = 'auto' | 'content' | 'none' | HTMLElement | (() => HTMLElement | null | undefined);

/** Where focus goes on closing, when it was inside: the trigger, nowhere, or an element. */
export type PopoverFinalFocus = 'trigger' | 'none' | HTMLElement | (() => HTMLElement | null | undefined);

// A little more than UI SDK's default, so the jelly's wobble clears the trigger.
const SIDE_OFFSET = 10;

export interface PopoverContentProps extends Omit<ComponentPropsWithRef<'div'>, 'children' | 'dir'> {
  /** Defaults to `bottom`. It flips to the other side when there isn't room. */
  readonly side?: PopoverSide;
  /** Defaults to `center`. */
  readonly align?: PopoverAlign;
  /** The gap between the trigger and the panel, in px. Defaults to 10. */
  readonly sideOffset?: number;
  /** A shift along the trigger, in px. */
  readonly alignOffset?: number;
  /** Space to keep from the edges of the viewport, in px. */
  readonly collisionPadding?: number;
  readonly initialFocus?: PopoverInitialFocus;
  readonly finalFocus?: PopoverFinalFocus;
  readonly id?: string;
  readonly className?: string;
  readonly style?: CSSProperties;
  /** A `PopoverTitle`, and whatever the task needs: text, fields, a `PopoverClose`. */
  readonly children?: ReactNode;
}

/**
 * The floating panel, placed against its trigger. It has the dialog role and
 * is named by its `PopoverTitle`. It stays in the page while closed, hidden,
 * so the jelly is ready to grow the moment it opens, and its content keeps
 * its state between opens.
 */
export function PopoverContent({
  children,
  className,
  ref,
  sideOffset = SIDE_OFFSET,
  ...props
}: PopoverContentProps): JSX.Element {
  const triggerRef = use(TriggerContext);
  if (triggerRef === null) {
    throw new Error('Agar: <PopoverContent> must be inside a <Popover>.');
  }
  const contentRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const refs = useMemo(() => ({ content: contentRef, canvas: canvasRef, trigger: triggerRef }), [triggerRef]);
  usePopoverJelly(refs);
  return (
    <PopoverContentPart
      {...props}
      keepMounted
      sideOffset={sideOffset}
      ref={useMergedRef(contentRef, ref)}
      className={classNames('agar-popover', className)}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="agar-jelly-canvas" />
      <div className="agar-popover-body">{children}</div>
    </PopoverContentPart>
  );
}
