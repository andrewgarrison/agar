import { TabsIndicator, TabsList as TabsListPart } from '@ui-sdk/react/tabs';
import type { ComponentPropsWithRef, CSSProperties, JSX, ReactNode } from 'react';
import { useMemo, useRef } from 'react';

import { classNames } from '#internal/class-names';
import { useMergedRef } from '#internal/refs';

import { useTabsJelly } from './use-tabs-jelly';

export interface TabsListProps extends Omit<ComponentPropsWithRef<'div'>, 'children' | 'dir'> {
  readonly id?: string;
  readonly className?: string;
  readonly style?: CSSProperties;
  /** The `TabsTab`s. */
  readonly children?: ReactNode;
}

/**
 * The row of tabs: a tablist with one tab stop, arrow keys between its tabs,
 * and the jelly that marks the selected one. Name it with `aria-label` or
 * `aria-labelledby`.
 */
export function TabsList({
  children,
  className,
  ref,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  ...props
}: TabsListProps): JSX.Element {
  const listRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const refs = useMemo(() => ({ list: listRef, canvas: canvasRef, indicator: indicatorRef }), []);
  const handlers = useTabsJelly(refs, { onPointerDown, onPointerMove, onPointerUp, onPointerLeave, onPointerCancel });
  return (
    <TabsListPart
      {...props}
      {...handlers}
      ref={useMergedRef(listRef, ref)}
      className={classNames('agar-tabs-list', className)}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="agar-jelly-canvas" />
      {children}
      {/* UI SDK measures the selected tab into this, and the jelly follows it.
          It shows as a plain pill until the jelly is ready. */}
      <TabsIndicator ref={indicatorRef} className="agar-tabs-indicator" />
    </TabsListPart>
  );
}
