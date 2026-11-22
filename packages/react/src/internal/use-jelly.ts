import type { BodyOptions, JellyMaterial, Theme } from '@agar/core';
import { JELLY_PALETTES, JellyBody, JellySurface } from '@agar/core';
import type { RefObject } from 'react';
import { useEffect, useEffectEvent, useRef } from 'react';

import { noop } from './noop';
import { useTheme } from './theme';

/** A surface with one body on it. */
export interface Jelly {
  readonly body: JellyBody;
  readonly surface: JellySurface;
}

export interface JellyOptions {
  readonly material: JellyMaterial;
  /** Px the canvas reaches past the container, so wobbles and the shadow aren't clipped. */
  readonly margin: number;
  readonly body?: BodyOptions;
  /** Runs on mount and whenever the container resizes. Place the body here. */
  readonly onLayout: (jelly: Jelly, container: HTMLElement) => void;
}

function createJelly(canvas: HTMLCanvasElement, options: JellyOptions, theme: Theme): Jelly | null {
  try {
    const surface = new JellySurface(canvas, options.margin);
    const body = new JellyBody(options.body);
    surface.add(body, JELLY_PALETTES[options.material][theme]);
    return { body, surface };
  } catch {
    // No 2D canvas to draw on, so the plain CSS fallback stays.
    return null;
  }
}

function observeSize(container: HTMLElement, layout: () => void): () => void {
  if (typeof ResizeObserver !== 'function') {
    return (): void => undefined;
  }
  const observer = new ResizeObserver(layout);
  observer.observe(container);
  return (): void => {
    observer.disconnect();
  };
}

// Sizes the surface to the container, keeps it sized, and marks the container
// ready so the CSS fallback steps aside. Returns the teardown.
function mount(jelly: Jelly, container: HTMLElement, onLayout: JellyOptions['onLayout']): () => void {
  const layout = (): void => {
    jelly.surface.resize(container.clientWidth, container.clientHeight);
    onLayout(jelly, container);
    jelly.surface.wake();
  };
  layout();
  const unobserve = observeSize(container, layout);
  container.dataset.jelly = 'ready';
  return (): void => {
    unobserve();
    jelly.surface.destroy();
    delete container.dataset.jelly;
  };
}

/**
 * Puts a jelly on `canvasRef`, sized to `containerRef`, and keeps its palette
 * in step with the theme. The ref stays null when the jelly can't draw (no
 * canvas, or during SSR), and the component's CSS fallback shows instead.
 */
export function useJelly(
  containerRef: RefObject<HTMLElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  options: JellyOptions,
): RefObject<Jelly | null> {
  const theme = useTheme();
  const jellyRef = useRef<Jelly | null>(null);
  const create = useEffectEvent((canvas: HTMLCanvasElement) => createJelly(canvas, options, theme));
  const onLayout = useEffectEvent((jelly: Jelly, container: HTMLElement) => {
    options.onLayout(jelly, container);
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const jelly = canvas === null ? null : create(canvas);
    if (jelly === null || container === null) {
      return noop;
    }
    jellyRef.current = jelly;
    const unmount = mount(jelly, container, onLayout);
    return (): void => {
      unmount();
      jellyRef.current = null;
    };
  }, [canvasRef, containerRef]);

  const { material } = options;
  useEffect(() => {
    const jelly = jellyRef.current;
    jelly?.surface.setPalette(jelly.body, JELLY_PALETTES[material][theme]);
  }, [material, theme]);

  return jellyRef;
}
