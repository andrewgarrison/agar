import type { JellyParams, Rect } from '@agar/core';
import type { PointerEvent, RefObject } from 'react';
import { useEffect, useRef } from 'react';

import { noop } from '#internal/noop';
import { rectOf } from '#internal/rect';
import type { Jelly } from '#internal/use-jelly';
import { useJelly } from '#internal/use-jelly';

// Room past the list for the jelly's wobble and shadow.
const MARGIN = 10;
const MAIN_BUTTON = 0;
// The jelly sits this far inside the selected tab, top and bottom.
const INSET = 3;
// The walls sit this far past the first and last tabs.
const WALL_GAP = 2;
const TAB = '[role="tab"]';
const PX = 'px';

// The dock's jelly, without idle breathing, so it sleeps once it settles.
const INDICATOR_PARAMS: Partial<JellyParams> = { breathe: 0 };

export interface TabsJellyRefs {
  readonly list: RefObject<HTMLDivElement | null>;
  readonly canvas: RefObject<HTMLCanvasElement | null>;
  readonly indicator: RefObject<HTMLSpanElement | null>;
}

type PointerHandler = ((event: PointerEvent<HTMLDivElement>) => void) | undefined;

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
  readonly [Key in keyof PointerHandlers]-?: (event: PointerEvent<HTMLDivElement>) => void;
};

function isVertical(list: HTMLElement): boolean {
  return list.dataset.orientation === 'vertical';
}

function inset(rect: Rect): Rect {
  return { ...rect, top: rect.top + INSET, bottom: rect.bottom - INSET };
}

// UI SDK writes whole px values, like "12px". Anything else is NaN.
function px(indicator: HTMLElement, name: string): number {
  const value = indicator.style.getPropertyValue(name).trim();
  return value.endsWith(PX) ? Number(value.slice(0, -PX.length)) : Number.NaN;
}

// The selected tab's box, from the variables UI SDK writes as inline style on
// the indicator. Null before it has measured, or when nothing is selected.
function indicatorRect(indicator: HTMLElement): Rect | null {
  const left = px(indicator, '--active-tab-left');
  const top = px(indicator, '--active-tab-top');
  const width = px(indicator, '--active-tab-width');
  const height = px(indicator, '--active-tab-height');
  if (![left, top, width, height].every((value) => Number.isFinite(value)) || width === 0) {
    return null;
  }
  return inset({ left, right: left + width, top, bottom: top + height });
}

// Soft walls just past the first and last tabs. The engine's walls are left
// and right only, so vertical tabs go without.
function setWalls(jelly: Jelly, list: HTMLElement): void {
  const tabs = list.querySelectorAll<HTMLElement>(TAB);
  const first = tabs.item(0);
  const last = tabs.item(tabs.length - 1);
  if (tabs.length > 0 && !isVertical(list)) {
    jelly.body.setBounds(first.offsetLeft - WALL_GAP, last.offsetLeft + last.offsetWidth + WALL_GAP);
  }
}

function layout(jelly: Jelly, list: HTMLElement, indicator: HTMLElement | null): void {
  setWalls(jelly, list);
  const rect = indicator === null ? null : indicatorRect(indicator);
  if (rect !== null) {
    jelly.body.place(rect);
  }
}

type Move = 'jump' | 'slide' | 'morph';

// The first measurement jumps, and so does UI SDK's `none` direction, which
// it uses for the first placement. The engine's lead-and-trail move is
// sideways, so vertical tabs morph instead.
function moveFor(jelly: Jelly, list: HTMLElement, indicator: HTMLElement): Move {
  if (jelly.body.rest === null || indicator.dataset.activationDirection === 'none') {
    return 'jump';
  }
  return isVertical(list) ? 'morph' : 'slide';
}

function follow(jelly: Jelly, rect: Rect, move: Move): void {
  if (move === 'jump') {
    jelly.body.place(rect);
  } else if (move === 'morph') {
    // A morph keeps a press's squish, so let go of it first.
    jelly.body.release(null);
    jelly.body.morphTo(rect);
  } else {
    jelly.body.release(rect);
  }
  jelly.surface.wake();
}

function observeIndicator(indicator: HTMLElement, onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(indicator, { attributes: true, attributeFilter: ['style', 'data-activation-direction'] });
  return (): void => {
    observer.disconnect();
  };
}

// UI SDK owns the selection. When it re-measures the selected tab, spring the
// jelly there. It writes the indicator more than once per change; the engine
// ignores a box the body is already heading for.
function useFollowSelection(
  refs: TabsJellyRefs,
  jellyRef: RefObject<Jelly | null>,
  pressedRef: RefObject<boolean>,
): void {
  useEffect(() => {
    const indicator = refs.indicator.current;
    return indicator === null
      ? noop
      : observeIndicator(indicator, () => {
          const jelly = jellyRef.current;
          const list = refs.list.current;
          const rect = indicatorRect(indicator);
          if (jelly !== null && list !== null && rect !== null) {
            pressedRef.current = false;
            follow(jelly, rect, moveFor(jelly, list, indicator));
          }
        });
  }, [refs, jellyRef, pressedRef]);
}

function pressedTab(event: PointerEvent<HTMLDivElement>): HTMLElement | null {
  const tab = event.target instanceof Element ? event.target.closest<HTMLElement>(TAB) : null;
  return tab === null || tab.dataset.disabled !== undefined ? null : tab;
}

// Pressing the selected tab squishes the jelly; pressing another tugs it that
// way. Vertical tabs only squish, since the tug is sideways.
function pressDown(jellyRef: RefObject<Jelly | null>, event: PointerEvent<HTMLDivElement>): boolean {
  const jelly = jellyRef.current;
  const tab = pressedTab(event);
  if (jelly === null || tab === null || event.button !== MAIN_BUTTON) {
    return false;
  }
  if (tab.dataset.selected === undefined && !isVertical(event.currentTarget)) {
    jelly.body.pressToward(inset(rectOf(tab)));
  } else {
    jelly.body.pressInPlace();
  }
  jelly.surface.wake();
  return true;
}

// Letting go on another tab selects it, and the observer springs the jelly
// there. Letting go anywhere else springs it back. The click that selects
// comes after pointerup in the same task, so check once that task is done.
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

// The jelly leans toward a nearby mouse, as the dock's does. Touch and pen
// have no hover.
function hover(jellyRef: RefObject<Jelly | null>, event: PointerEvent<HTMLDivElement>): void {
  const jelly = jellyRef.current;
  const list = event.currentTarget;
  if (jelly === null || event.pointerType !== 'mouse') {
    return;
  }
  const box = list.getBoundingClientRect();
  // The body measures from the padding box, inside the border.
  jelly.body.setPointer({ x: event.clientX - box.left - list.clientLeft, y: event.clientY - box.top - list.clientTop });
  jelly.surface.wake();
}

function unhover(jellyRef: RefObject<Jelly | null>): void {
  jellyRef.current?.body.setPointer(null);
  jellyRef.current?.surface.wake();
}

function usePress(
  handlers: PointerHandlers,
  jellyRef: RefObject<Jelly | null>,
  pressedRef: RefObject<boolean>,
): ComposedHandlers {
  const release =
    (handler: PointerHandler) =>
    (event: PointerEvent<HTMLDivElement>): void => {
      handler?.(event);
      letGo(jellyRef, pressedRef);
    };
  return {
    onPointerDown: (event) => {
      handlers.onPointerDown?.(event);
      pressedRef.current = pressDown(jellyRef, event);
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
 * Drives a tint jelly from UI SDK's tab selection. It only reads that state:
 * it never selects anything.
 */
export function useTabsJelly(refs: TabsJellyRefs, handlers: PointerHandlers): ComposedHandlers {
  const pressedRef = useRef(false);
  const jellyRef = useJelly(refs.list, refs.canvas, {
    material: 'tint',
    margin: MARGIN,
    body: { params: INDICATOR_PARAMS },
    onLayout: (jelly, list) => {
      layout(jelly, list, refs.indicator.current);
    },
  });
  useFollowSelection(refs, jellyRef, pressedRef);
  return usePress(handlers, jellyRef, pressedRef);
}
