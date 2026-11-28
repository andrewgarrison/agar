import type { JellyParams } from '@agar/core';
import type { FocusEvent, KeyboardEvent, PointerEvent, RefObject } from 'react';
import { useEffect } from 'react';

import { clipToJelly } from '#internal/glass';
import { noop } from '#internal/noop';
import type { Jelly } from '#internal/use-jelly';
import { useJelly } from '#internal/use-jelly';

// Room past the button for the squish's bulge and the shadow below it.
const MARGIN = 16;
const MAIN_BUTTON = 0;
// Idle waves while a press's Promise runs, in px. Reduced motion turns them off.
const PENDING_BREATHE = 2;

// Glass at a glance, gelatin to the touch: a press sinks in deep and slow,
// and letting go sets off a soft, low wobble that takes about a second to
// die away, calm rather than snappy. It sleeps once it settles, unless the
// button is pending. Hover is mostly light (the rim turns to the cursor): the
// surface only gives a hint toward the mouse, 1px within 30px, a third of the
// dock's lean, so the movement stays with the press.
const BUTTON_PARAMS: Partial<JellyParams> = {
  breathe: 0,
  pokeK: 300,
  pokeZ: 0.2,
  pokeWiden: 5,
  pokeFlatten: 0.2,
  surfK: 380,
  surfZ: 0.12,
  hoverReach: 1,
  hoverRadius: 30,
};

export interface ButtonJellyRefs {
  readonly root: RefObject<HTMLButtonElement | null>;
  /** The frosted layer, clipped to the jelly's outline. */
  readonly glass: RefObject<HTMLElement | null>;
  readonly canvas: RefObject<HTMLCanvasElement | null>;
}

type Handler<Event> = ((event: Event) => void) | undefined;
type Pointer = PointerEvent<HTMLButtonElement>;
type Key = KeyboardEvent<HTMLButtonElement>;
type Focus = FocusEvent<HTMLButtonElement>;

/** The consumer's own handlers, which run before the jelly's. */
export interface ButtonHandlers {
  readonly onPointerDown?: Handler<Pointer>;
  readonly onPointerMove?: Handler<Pointer>;
  readonly onPointerUp?: Handler<Pointer>;
  readonly onPointerLeave?: Handler<Pointer>;
  readonly onPointerCancel?: Handler<Pointer>;
  readonly onKeyDown?: Handler<Key>;
  readonly onKeyUp?: Handler<Key>;
  readonly onBlur?: Handler<Focus>;
}

/** The same handlers, with the jelly's squish and hover added. */
export interface ComposedButtonHandlers {
  readonly onPointerDown: (event: Pointer) => void;
  readonly onPointerMove: (event: Pointer) => void;
  readonly onPointerUp: (event: Pointer) => void;
  readonly onPointerLeave: (event: Pointer) => void;
  readonly onPointerCancel: (event: Pointer) => void;
  readonly onKeyDown: (event: Key) => void;
  readonly onKeyUp: (event: Key) => void;
  readonly onBlur: (event: Focus) => void;
}

// Disabled, or pending: a press does nothing, so the jelly doesn't answer it.
function isInert(root: HTMLElement): boolean {
  return root.dataset.disabled !== undefined || root.dataset.pending !== undefined;
}

function isPressKey(event: Key): boolean {
  return event.key === ' ' || event.key === 'Enter';
}

// The jelly fills the button's padding box.
function layoutButton(jelly: Jelly, root: HTMLElement): void {
  jelly.body.place({ left: 0, top: 0, right: root.clientWidth, bottom: root.clientHeight });
}

function squish(jellyRef: RefObject<Jelly | null>, root: HTMLElement): void {
  const jelly = jellyRef.current;
  if (jelly !== null && !isInert(root)) {
    jelly.body.pressInPlace();
    jelly.surface.wake();
  }
}

function letGo(jellyRef: RefObject<Jelly | null>): void {
  jellyRef.current?.body.release(null);
  jellyRef.current?.surface.wake();
}

// The surface leans toward a nearby mouse. Touch and pen have no hover.
function hover(jellyRef: RefObject<Jelly | null>, event: Pointer): void {
  const jelly = jellyRef.current;
  const root = event.currentTarget;
  if (jelly === null || event.pointerType !== 'mouse' || isInert(root)) {
    return;
  }
  const box = root.getBoundingClientRect();
  // The body measures from the padding box, inside the border.
  jelly.body.setPointer({ x: event.clientX - box.left - root.clientLeft, y: event.clientY - box.top - root.clientTop });
  jelly.surface.wake();
}

function unhover(jellyRef: RefObject<Jelly | null>): void {
  jellyRef.current?.body.setPointer(null);
  jellyRef.current?.surface.wake();
}

function observePending(root: HTMLElement, onChange: (pending: boolean) => void): () => void {
  const observer = new MutationObserver(() => {
    onChange(root.dataset.pending !== undefined);
  });
  observer.observe(root, { attributes: true, attributeFilter: ['data-pending'] });
  return (): void => {
    observer.disconnect();
  };
}

// UI SDK marks the button `data-pending` while the Promise its press returned
// runs. The jelly breathes meanwhile, and goes back to sleep once it settles.
function useBreatheWhilePending(rootRef: RefObject<HTMLButtonElement | null>, jellyRef: RefObject<Jelly | null>): void {
  useEffect(() => {
    const root = rootRef.current;
    return root === null
      ? noop
      : observePending(root, (pending) => {
          const jelly = jellyRef.current;
          if (jelly !== null) {
            jelly.body.params.breathe = pending ? PENDING_BREATHE : 0;
            jelly.surface.wake();
          }
        });
  }, [rootRef, jellyRef]);
}

function compose(handlers: ButtonHandlers, jellyRef: RefObject<Jelly | null>): ComposedButtonHandlers {
  const release =
    <Event>(handler: Handler<Event>) =>
    (event: Event): void => {
      handler?.(event);
      letGo(jellyRef);
    };
  return {
    onPointerDown: (event) => {
      handlers.onPointerDown?.(event);
      if (event.button === MAIN_BUTTON) {
        squish(jellyRef, event.currentTarget);
      }
    },
    onPointerMove: (event) => {
      handlers.onPointerMove?.(event);
      hover(jellyRef, event);
    },
    onPointerUp: release(handlers.onPointerUp),
    onPointerLeave: (event) => {
      release(handlers.onPointerLeave)(event);
      unhover(jellyRef);
    },
    onPointerCancel: release(handlers.onPointerCancel),
    // Space presses on keyup and Enter on keydown, but both squish while held.
    onKeyDown: (event) => {
      handlers.onKeyDown?.(event);
      if (isPressKey(event) && !event.repeat) {
        squish(jellyRef, event.currentTarget);
      }
    },
    onKeyUp: (event) => {
      handlers.onKeyUp?.(event);
      if (isPressKey(event)) {
        letGo(jellyRef);
      }
    },
    onBlur: release(handlers.onBlur),
  };
}

/**
 * Drives a jelly that fills the button: it squishes while pressed, by
 * pointer or key, leans toward a nearby mouse, and breathes while pending.
 * The frosted layer follows its outline. It
 * only reads UI SDK's state: it never presses anything.
 */
export function useButtonJelly(refs: ButtonJellyRefs, handlers: ButtonHandlers): ComposedButtonHandlers {
  const jellyRef = useJelly(refs.root, refs.canvas, {
    material: 'frost',
    margin: MARGIN,
    body: { params: BUTTON_PARAMS },
    onLayout: layoutButton,
    onDraw: (jelly) => {
      clipToJelly(refs.glass.current, jelly);
    },
  });
  useBreatheWhilePending(refs.root, jellyRef);
  return compose(handlers, jellyRef);
}
