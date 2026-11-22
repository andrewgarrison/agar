import { TabsPanel as TabsPanelPart } from '@ui-sdk/react/tabs';
import type { ComponentPropsWithRef, CSSProperties, JSX, ReactNode } from 'react';

import { classNames } from '#internal/class-names';

export interface TabsPanelProps extends Omit<ComponentPropsWithRef<'div'>, 'children' | 'dir'> {
  /** Matches the `TabsTab` that shows this panel. */
  readonly value: string;
  /** Keeps the panel in the DOM, hidden, while its tab isn't selected. */
  readonly keepMounted?: boolean;
  /** Hides it with `hidden="until-found"`, so find-in-page can reveal it. */
  readonly hiddenUntilFound?: boolean;
  readonly id?: string;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly children?: ReactNode;
}

/** The content of the tab with the same `value`, shown while that tab is selected. */
export function TabsPanel({ className, ...props }: TabsPanelProps): JSX.Element {
  return <TabsPanelPart {...props} className={classNames('agar-tabs-panel', className)} />;
}
