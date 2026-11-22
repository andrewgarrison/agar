import { Popover as PopoverRoot } from '@ui-sdk/react/popover';
import type { JSX, ReactNode } from 'react';
import { useRef } from 'react';

import { TriggerContext } from './context';

/** Why the popover opened or closed. */
export type PopoverOpenChangeReason =
  | 'trigger-press'
  | 'trigger-hover'
  | 'outside-press'
  | 'escape-key'
  | 'focus-out'
  | 'window-blur'
  | 'close-press'
  | 'back'
  | 'shortcut'
  | 'swipe'
  | 'imperative';

export interface PopoverOpenChangeDetails {
  /**
   * `trigger-press` for a click, tap, Enter or Space on the trigger;
   * `close-press` for a `PopoverClose`; `escape-key`, `outside-press` and
   * `focus-out` for the ways it's dismissed.
   */
  readonly reason: PopoverOpenChangeReason;
  /** The DOM event behind the change, when there is one. */
  readonly event?: Event | undefined;
  /** Keeps it as it is. A controlled popover ignores it, since its state comes from you. */
  readonly cancel: () => void;
}

/** The dismissals `dismissible={false}` refuses. */
export type PopoverDismissReason = 'outside-press' | 'escape-key' | 'back' | 'swipe';

export interface PopoverDismissAttemptDetails {
  readonly reason: PopoverDismissReason;
  readonly event?: Event | undefined;
}

export interface PopoverProps {
  /** Whether it's open. Pass it with `onOpenChange` to control the popover. */
  readonly open?: boolean;
  /** Whether it starts open, when uncontrolled. */
  readonly defaultOpen?: boolean;
  /** Runs when the popover wants to open or close. */
  readonly onOpenChange?: (open: boolean, details: PopoverOpenChangeDetails) => void;
  /** Runs once it has finished opening or closing, after the jelly has shrunk away. */
  readonly onOpenChangeComplete?: (open: boolean) => void;
  /**
   * `false` (the default) leaves the page usable, and focus leaving closes the
   * popover. `true` also traps focus, locks scroll and makes the rest of the
   * page inert. `trap-focus` traps focus but leaves the page usable.
   */
  readonly modal?: boolean | 'trap-focus';
  /**
   * Whether Escape, an outside press or focus leaving can close it. Pass
   * `false` while it holds unsaved work, and ask in `onDismissAttempt`. The
   * trigger and `PopoverClose` can always close it.
   */
  readonly dismissible?: boolean;
  /** Runs when `dismissible={false}` refused an Escape or outside press. */
  readonly onDismissAttempt?: (details: PopoverDismissAttemptDetails) => void;
  /** A `PopoverTrigger` and a `PopoverContent`. */
  readonly children?: ReactNode;
}

/**
 * Rich content in a floating glass panel, opened from a button. The jelly
 * grows out of the trigger and shrinks back into it. Compose it from
 * `PopoverTrigger` and `PopoverContent`, with a `PopoverTitle` inside.
 */
export function Popover({ children, ...props }: PopoverProps): JSX.Element {
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <TriggerContext value={triggerRef}>
      <PopoverRoot {...props}>{children}</PopoverRoot>
    </TriggerContext>
  );
}
