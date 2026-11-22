import type { Theme } from '@agar/core';
import { useSyncExternalStore } from 'react';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function darkQuery(): MediaQueryList | null {
  return typeof matchMedia === 'function' ? matchMedia(DARK_QUERY) : null;
}

/**
 * The theme Agar follows: `data-theme="light"` or `"dark"` on `<html>`, or
 * else the OS setting. Agar's CSS reads the same two things.
 */
export function currentTheme(): Theme {
  const attribute = document.documentElement.dataset.theme;
  if (attribute === 'light' || attribute === 'dark') {
    return attribute;
  }
  return darkQuery()?.matches === true ? 'dark' : 'light';
}

function subscribe(onChange: () => void): () => void {
  const query = darkQuery();
  query?.addEventListener('change', onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return (): void => {
    query?.removeEventListener('change', onChange);
    observer.disconnect();
  };
}

// The server can't know the theme. Only palettes depend on it, never markup,
// so hydration doesn't mismatch.
function serverTheme(): Theme {
  return 'light';
}

/** The current theme, kept up to date. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, currentTheme, serverTheme);
}
