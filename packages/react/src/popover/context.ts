import type { Context, RefObject } from 'react';
import { createContext } from 'react';

/** The trigger element, shared from `Popover` to its parts so the jelly can grow out of it. */
export const TriggerContext: Context<RefObject<HTMLButtonElement | null> | null> =
  createContext<RefObject<HTMLButtonElement | null> | null>(null);
