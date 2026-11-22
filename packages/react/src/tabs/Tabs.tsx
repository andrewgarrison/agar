import { Tabs as TabsRoot } from '@ui-sdk/react/tabs';
import type { ComponentPropsWithRef, CSSProperties, JSX, ReactNode } from 'react';

import { classNames } from '#internal/class-names';

/** Why the selected tab changed. */
export type TabsChangeReason = 'item-press' | 'list-navigation' | 'find-in-page' | 'item-removed' | 'imperative';

export interface TabsChangeDetails {
  /**
   * `item-press` for a click, tap, Enter or Space; `list-navigation` for an
   * arrow key, Home or End with automatic activation; `find-in-page` when the
   * browser reveals a hidden panel; `item-removed` when the selected tab goes
   * away.
   */
  readonly reason: TabsChangeReason;
  /** The DOM event behind the change, when there is one. */
  readonly event?: Event | undefined;
  /** Keeps the current tab. Controlled tabs ignore it, since their value comes from you. */
  readonly cancel: () => void;
}

/** Which way the tabs run, and so which arrow keys move between them. */
export type TabsOrientation = 'horizontal' | 'vertical';

type DivProps = Omit<ComponentPropsWithRef<'div'>, 'children' | 'defaultValue' | 'dir' | 'onChange' | 'onSelect'>;

export interface TabsProps<Value extends string = string> extends DivProps {
  /** The selected tab's value. Pass it with `onValueChange` to control the tabs. */
  readonly value?: Value | null;
  /** The tab selected at first, when uncontrolled. Defaults to the first tab that isn't disabled. */
  readonly defaultValue?: Value | null;
  /** Runs when the selected tab changes. */
  readonly onValueChange?: (value: Value | null, details: TabsChangeDetails) => void;
  /** `horizontal` (the default) moves with Left and Right; `vertical` with Up and Down. */
  readonly orientation?: TabsOrientation;
  /**
   * `automatic` (the default) selects a tab as soon as an arrow key focuses it.
   * `manual` waits for Enter or Space: use it when showing a panel is slow.
   */
  readonly activation?: 'automatic' | 'manual';
  /** Whether arrow keys wrap from the last tab to the first. Defaults to true. */
  readonly loop?: boolean;
  /** Hides unselected panels with `hidden="until-found"`, so find-in-page can reveal them. */
  readonly hiddenUntilFound?: boolean;
  readonly id?: string;
  readonly className?: string;
  readonly style?: CSSProperties;
  /** A `TabsList` of `TabsTab`s, and a `TabsPanel` for each. */
  readonly children?: ReactNode;
}

/**
 * Layered sections of content, one shown at a time, with a jelly that springs
 * to the selected tab. Compose it from `TabsList`, `TabsTab` and `TabsPanel`.
 */
export function Tabs<Value extends string = string>({ className, ...props }: TabsProps<Value>): JSX.Element {
  return <TabsRoot<Value> {...props} className={classNames('agar-tabs', className)} />;
}
