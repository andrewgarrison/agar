import type { JellyParams } from '@agar/core';
import type { PointerEvent, RefObject } from 'react';
import { useEffect, useRef } from 'react';

import { noop } from '#internal/noop';
import { mirrored, rectOf } from '#internal/rect';
import type { Jelly } from '#internal/use-jelly';
import { useJelly } from '#internal/use-jelly';

// Room past the track for the thumb's wobble and shadow.
const MARGIN = 10;
const MAIN_BUTTON = 0;

// A firm, milky thumb that sleeps once it settles.
const THUMB_PARAMS: Partial<JellyParams> = {
  breathe: 0,
  pressMaxReach: 9,
  pressReach: 0.4,
  maxStretch: 1.9,
  pokeWiden: 2,
  // A little bouncier than the spike: the edges carry some momentum into the
  // soft wall at the end of the track, so the body squashes into it and
  // settles in about 630 ms (the spike: 425 ms).
  wallZ: 0.6,
  leadZ: 0.55,
  trailZ: 0.55,
  settleZ: 0.5,
  vertZ: 0.47,
  inertia: 0.075,
  slosh: 0.058,
  // About half the dock's hover (3 px within 46 px), sized to the 24 px thumb:
  // the near side leans toward the mouse by under a pixel, and the whole
  // thumb barely slides.
  hoverReach: 2,
  hoverRadius: 34,
};

export interface SwitchJellyRefs {
  readonly root: RefObject<HTMLButtonElement | null>;
  readonly canvas: RefObject<HTMLCanvasElement | null>;
  readonly thumb: RefObject<HTMLSpanElement | null>;
}

type PointerHandler = ((event: PointerEvent<HTMLButtonElement>) => void) | undefined;

/** The consumer's own pointer handlers, which run before the jelly's. */
export interface PointerHandlers {
  readonly onPointerDown?: PointerHandler;
  readonly onPointerMove?: PointerHandler;
  readonly onPointerUp?: PointerHandler;
  readonly onPointerLeave?: PointerHandler;
  readonly onPointerCancel?: PointerHandler;
}

/** The same handlers, with the jelly's hover, press and release added. */
export type ComposedHandlers = {
  readonly [Key in keyof PointerHandlers]-?: (event: PointerEvent<HTMLButtonElement>) => void;
};

// The thumb has the same gap on every side, so its top is the wall's inset.
function layoutThumb(jelly: Jelly, root: HTMLElement, thumb: HTMLElement): void {
  const rect = rectOf(thumb);
  jelly.body.setBounds(rect.top, root.clientWidth - rect.top);
  jelly.body.place(rect);
}

function observeChecked(root: HTMLElement, onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(root, { attributes: true, attributeFilter: ['data-checked'] });
  return (): void => {
    observer.disconnect();
  };
}

// UI SDK owns the state. When `data-checked` flips, CSS has already moved the
// real thumb, so measure where it went and spring there.
function useFollowChecked(
  refs: SwitchJellyRefs,
  jellyRef: RefObject<Jelly | null>,
  pressedRef: RefObject<boolean>,
): void {
  useEffect(() => {
    const root = refs.root.current;
    return root === null
      ? noop
      : observeChecked(root, () => {
          const jelly = jellyRef.current;
          const thumb = refs.thumb.current;
          if (jelly !== null && thumb !== null) {
            pressedRef.current = false;
            jelly.body.release(rectOf(thumb));
            jelly.surface.wake();
          }
        });
  }, [refs, jellyRef, pressedRef]);
}

function isDisabled(root: HTMLElement): boolean {
  return root.dataset.disabled !== undefined;
}

// Pressing tugs the thumb toward the other end.
function pressDown(
  jellyRef: RefObject<Jelly | null>,
  thumb: HTMLElement | null,
  event: PointerEvent<HTMLButtonElement>,
): boolean {
  const jelly = jellyRef.current;
  const root = event.currentTarget;
  if (jelly === null || thumb === null || event.button !== MAIN_BUTTON || isDisabled(root)) {
    return false;
  }
  jelly.body.pressToward(mirrored(rectOf(thumb), root.clientWidth));
  jelly.surface.wake();
  return true;
}

// Letting go on the switch toggles it, and the observer springs the thumb
// over. Letting go anywhere else springs it back. The click that toggles comes
// after pointerup in the same task, so check once that task is done.
function letGo(jellyRef: RefObject<Jelly | null>, pressedRef: RefObject<boolean>): void {
  if (!pressedRef.current) {
    return;
  }
  setTimeout(() => {
    if (!pressedRef.current) {
      return;
    }
    pressedRef.current = false;
    jellyRef.current?.body.release(null);
    jellyRef.current?.surface.wake();
  }, 0);
}

// The surface leans toward a nearby mouse, as the dock's jelly does. Touch and
// pen have no hover, and a disabled switch doesn't respond.
function hover(jellyRef: RefObject<Jelly | null>, event: PointerEvent<HTMLButtonElement>): void {
  const jelly = jellyRef.current;
  const root = event.currentTarget;
  if (jelly === null || event.pointerType !== 'mouse' || isDisabled(root)) {
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

interface PressOptions {
  readonly handlers: PointerHandlers;
  readonly thumbRef: RefObject<HTMLSpanElement | null>;
  readonly jellyRef: RefObject<Jelly | null>;
  readonly pressedRef: RefObject<boolean>;
}

function usePress({ handlers, thumbRef, jellyRef, pressedRef }: PressOptions): ComposedHandlers {
  const release =
    (handler: PointerHandler) =>
    (event: PointerEvent<HTMLButtonElement>): void => {
      handler?.(event);
      letGo(jellyRef, pressedRef);
    };
  return {
    onPointerDown: (event) => {
      handlers.onPointerDown?.(event);
      pressedRef.current = pressDown(jellyRef, thumbRef.current, event);
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
  };
}

/**
 * Drives a milk jelly thumb from UI SDK's switch state. It only reads that
 * state: it never toggles anything.
 */
export function useSwitchJelly(refs: SwitchJellyRefs, handlers: PointerHandlers): ComposedHandlers {
  const pressedRef = useRef(false);
  const jellyRef = useJelly(refs.root, refs.canvas, {
    material: 'milk',
    margin: MARGIN,
    body: { params: THUMB_PARAMS },
    onLayout: (jelly, root) => {
      if (refs.thumb.current !== null) {
        layoutThumb(jelly, root, refs.thumb.current);
      }
    },
  });
  useFollowChecked(refs, jellyRef, pressedRef);
  return usePress({ handlers, thumbRef: refs.thumb, jellyRef, pressedRef });
}
