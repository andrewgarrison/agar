import type { Context, RefObject } from 'react';
import { createContext } from 'react';

/** The thumb element, shared from `Switch` to `SwitchThumb` so the jelly can measure it. */
export const ThumbContext: Context<RefObject<HTMLSpanElement | null> | null> =
  createContext<RefObject<HTMLSpanElement | null> | null>(null);
