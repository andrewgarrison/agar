import type { JellyParams, Rect } from '@agar/core';
import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';

import { noop } from '#internal/noop';
import type { Jelly } from '#internal/use-jelly';
import { useJelly } from '#internal/use-jelly';

// The canvas reaches this far past the panel, so the jelly can start (and
// end) on the trigger beside it.
const MARGIN = 72;
const RADIUS = 20;
// Opacity per second: it fades in as it grows, and out a little slower as it
// shrinks, so it's still visible as it reaches the trigger.
const FADE_IN = 16;
const FADE_OUT = 9;

// The spike's panel tuning: a looser stretch and softer edges than a thumb,
// so the panel wobbles as it grows. No idle breathing, so it sleeps once it
// settles.
const PANEL_PARAMS: Partial<JellyParams> = {
  breathe: 0,
  maxStretch: 20,
  maxDisp: 14,
  vertK: 260,
  vertZ: 0.55,
  settleK: 300,
  settleZ: 0.58,
};

export interface PopoverJellyRefs {
  readonly content: RefObject<HTMLDivElement | null>;
  readonly canvas: RefObject<HTMLCanvasElement | null>;
  readonly trigger: RefObject<HTMLButtonElement | null>;
}

function isOpen(content: HTMLElement): boolean {
  return content.dataset.open !== undefined;
}

// The panel's own box, in its padding box: where the jelly settles.
function panelRect(content: HTMLElement): Rect {
  return { left: 0, top: 0, right: content.clientWidth, bottom: content.clientHeight };
}

// The trigger's box, in the panel's padding box. Null when there's no
// trigger on the page, or the panel isn't laid out.
function triggerRect(content: HTMLElement, trigger: HTMLElement | null): Rect | null {
  if (trigger === null || !trigger.isConnected || content.clientWidth === 0) {
    return null;
  }
  const from = trigger.getBoundingClientRect();
  const box = content.getBoundingClientRect();
  const left = box.left + content.clientLeft;
  const top = box.top + content.clientTop;
  return { left: from.left - left, right: from.right - left, top: from.top - top, bottom: from.bottom - top };
}

// Grows out of the trigger into the panel. Without a trigger to grow from, it
// fades in where the panel is.
function grow(jelly: Jelly, content: HTMLElement, trigger: HTMLElement | null): void {
  // Read the colour fresh. It may have changed while the panel was closed,
  // and Firefox doesn't restyle an open popover when the theme changes.
  jelly.recolor();
  const from = triggerRect(content, trigger) ?? panelRect(content);
  jelly.body.place(from);
  jelly.body.opacity = 0;
  jelly.body.fadeTo(1, FADE_IN);
  jelly.body.morphTo(panelRect(content));
  jelly.surface.wake();
}

// Shrinks back into the trigger and fades out. The stylesheet keeps the
// closing panel on the page for as long as this takes.
function shrink(jelly: Jelly, content: HTMLElement, trigger: HTMLElement | null): void {
  const to = triggerRect(content, trigger);
  if (to !== null && jelly.body.rest !== null) {
    jelly.body.morphTo(to);
  }
  jelly.body.fadeTo(0, FADE_OUT);
  jelly.surface.wake();
}

function observeOpen(content: HTMLElement, onChange: (open: boolean) => void): () => void {
  let open = isOpen(content);
  const observer = new MutationObserver(() => {
    if (isOpen(content) !== open) {
      open = !open;
      onChange(open);
    }
  });
  observer.observe(content, { attributes: true, attributeFilter: ['data-open'] });
  return (): void => {
    observer.disconnect();
  };
}

// UI SDK owns opening and closing. When it opens the panel, wait a frame for
// it to be placed, then grow the jelly out of the trigger. When it closes,
// shrink the jelly back.
function useFollowOpen(refs: PopoverJellyRefs, jellyRef: RefObject<Jelly | null>, frameRef: RefObject<number>): void {
  useEffect(() => {
    const content = refs.content.current;
    if (content === null) {
      return noop;
    }
    const unobserve = observeOpen(content, (open) => {
      cancelAnimationFrame(frameRef.current);
      const jelly = jellyRef.current;
      if (jelly === null) {
        return;
      }
      if (open) {
        frameRef.current = requestAnimationFrame(() => {
          grow(jelly, content, refs.trigger.current);
        });
      } else {
        shrink(jelly, content, refs.trigger.current);
      }
    });
    return (): void => {
      unobserve();
      cancelAnimationFrame(frameRef.current);
    };
  }, [refs, jellyRef, frameRef]);
}

/**
 * Drives a glass jelly from UI SDK's popover state: it grows out of the
 * trigger as the panel opens, follows the panel's size while it's open, and
 * shrinks back as it closes. It only reads that state: it never opens or
 * closes anything.
 */
export function usePopoverJelly(refs: PopoverJellyRefs): void {
  const frameRef = useRef(0);
  const jellyRef = useJelly(refs.content, refs.canvas, {
    material: 'glass',
    margin: MARGIN,
    body: { radius: RADIUS, params: PANEL_PARAMS },
    // The panel's size settles after it opens (fonts, content), so follow it.
    // A popover that's open from the start just appears.
    onLayout: (jelly, content) => {
      if (!isOpen(content) || content.clientWidth === 0) {
        return;
      }
      if (jelly.body.rest === null) {
        jelly.body.place(panelRect(content));
      } else {
        jelly.body.morphTo(panelRect(content));
      }
    },
  });
  useFollowOpen(refs, jellyRef, frameRef);
}
