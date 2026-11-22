import { TabsTab as TabsTabPart } from '@ui-sdk/react/tabs';
import type { ComponentPropsWithRef, CSSProperties, JSX } from 'react';

import { classNames } from '#internal/class-names';

export interface TabsTabProps extends Omit<ComponentPropsWithRef<'button'>, 'dir' | 'type' | 'value'> {
  /** Matches the `TabsPanel` this tab shows. */
  readonly value: string;
  /** Stops the tab being selected. Arrow keys still reach it, so its label can say why. */
  readonly disabled?: boolean;
  readonly id?: string;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/** A tab. Selecting it shows the `TabsPanel` with the same `value`. */
export function TabsTab({ className, ...props }: TabsTabProps): JSX.Element {
  return <TabsTabPart {...props} className={classNames('agar-tabs-tab', className)} />;
}
