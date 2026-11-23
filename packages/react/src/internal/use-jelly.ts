import type { BodyOptions, JellyMaterial, JellyPalette, Theme } from '@agar/core';
import { JELLY_PALETTES, JellyBody, JellySurface } from '@agar/core';
import type { RefObject } from 'react';
import { useEffect, useEffectEvent, useRef } from 'react';

import { withCustomTint } from './jelly-color';
import { noop } from './noop';
import { currentTheme, useTheme } from './theme';

/** A surface with one body on it. */
export interface Jelly {
  readonly body: JellyBody;
  readonly surface: JellySurface;
  /**
   * Reads the palette again: the material's for the current theme, with the
   * container's `--agar-jelly-tint`. It runs on mount and on theme changes;
   * call it when the colour may have changed otherwise.
   */
  readonly recolor: (theme?: Theme) => void;
}

export interface JellyOptions {
  readonly material: JellyMaterial;
  /** Px the canvas reaches past the container, so wobbles and the shadow aren't clipped. */
  readonly margin: number;
  readonly body?: BodyOptions;
  /** Runs on mount and whenever the container resizes. Place the body here. */
  readonly onLayout: (jelly: Jelly, container: HTMLElement) => void;
}

// The material's palette for the theme, recoloured by the container's
// `--agar-jelly-tint` when it sets one.
function paletteFor(material: JellyMaterial, theme: Theme, container: HTMLElement): JellyPalette {
  return withCustomTint(JELLY_PALETTES[material][theme], container);
}

function createJelly(canvas: HTMLCanvasElement, container: HTMLElement, options: JellyOptions): Jelly | null {
  const palette = (theme: Theme): JellyPalette => paletteFor(options.material, theme, container);
  try {
    const surface = new JellySurface(canvas, options.margin);
    const body = new JellyBody(options.body);
    surface.add(body, palette(currentTheme()));
    const recolor = (theme: Theme = currentTheme()): void => {
      surface.setPalette(body, palette(theme));
    };
    return { body, surface, recolor };
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
  const create = useEffectEvent((canvas: HTMLCanvasElement, container: HTMLElement) =>
    createJelly(canvas, container, options),
  );
  const onLayout = useEffectEvent((jelly: Jelly, container: HTMLElement) => {
    options.onLayout(jelly, container);
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const jelly = canvas === null || container === null ? null : create(canvas, container);
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

  // A new theme changes the material's palette, and can change the custom
  // tint too, through `light-dark()`.
  useEffect(() => {
    jellyRef.current?.recolor(theme);
  }, [theme]);

  return jellyRef;
}
