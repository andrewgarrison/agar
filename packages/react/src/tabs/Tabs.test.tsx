import { surfaceCount } from '@agar/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import type { JSX } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { TabsProps } from './Tabs';
import { Tabs } from './Tabs';
import { TabsList } from './TabsList';
import { TabsPanel } from './TabsPanel';
import { TabsTab } from './TabsTab';

function isContext(value: unknown): value is CanvasRenderingContext2D {
  return (
    (typeof value === 'function' || typeof value === 'object') &&
    value !== null &&
    typeof Reflect.get(value, 'drawImage') === 'function'
  );
}

// A 2D context that accepts every call, so the stage can draw in jsdom.
function fakeContext(): CanvasRenderingContext2D {
  const fake: unknown = new Proxy(() => fake, { get: () => fake });
  if (!isContext(fake)) {
    throw new TypeError('expected a context');
  }
  return fake;
}

function withCanvas(): void {
  const context = fakeContext();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind: string) =>
    kind === '2d' ? context : null,
  );
}

function withoutCanvas(): void {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
}

type Topic = 'tokens' | 'motion' | 'access';

function Topics(props: Omit<TabsProps<Topic>, 'children'>): JSX.Element {
  return (
    <Tabs<Topic> defaultValue="tokens" {...props}>
      <TabsList aria-label="Topics">
        <TabsTab value="tokens">Tokens</TabsTab>
        <TabsTab value="motion">Motion</TabsTab>
        <TabsTab value="access" disabled>
          Access
        </TabsTab>
      </TabsList>
      <TabsPanel value="tokens">Colour and spacing.</TabsPanel>
      <TabsPanel value="motion">Springs, not tweens.</TabsPanel>
      <TabsPanel value="access">Behaviour from UI SDK.</TabsPanel>
    </Tabs>
  );
}

function tabNamed(name: string): HTMLElement {
  return screen.getByRole('tab', { name });
}

describe(Tabs, () => {
  it('is a named tablist whose selected tab labels the visible panel', () => {
    expect.assertions(4);
    withoutCanvas();
    render(<Topics />);
    expect(screen.getByRole('tablist', { name: 'Topics' })).toBeInTheDocument();
    expect(tabNamed('Tokens')).toHaveAttribute('aria-selected', 'true');
    expect(tabNamed('Motion')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel', { name: 'Tokens' })).toHaveTextContent('Colour and spacing.');
  });

  it('selects a tab on click and shows its panel', async () => {
    expect.assertions(2);
    withoutCanvas();
    render(<Topics />);
    await userEvent.click(tabNamed('Motion'));
    expect(tabNamed('Motion')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Motion' })).toHaveTextContent('Springs, not tweens.');
  });

  it('moves and selects with the arrow keys, Home and End', async () => {
    expect.assertions(3);
    withoutCanvas();
    render(<Topics />);
    tabNamed('Tokens').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(tabNamed('Motion')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Home}');
    expect(tabNamed('Tokens')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowLeft}');
    // Wraps past the disabled tab's selection: focus can land on it, but it never selects.
    expect(tabNamed('Access')).toHaveAttribute('aria-selected', 'false');
  });

  it('waits for Enter with manual activation', async () => {
    expect.assertions(2);
    withoutCanvas();
    render(<Topics activation="manual" />);
    tabNamed('Tokens').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(tabNamed('Tokens')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Enter}');
    expect(tabNamed('Motion')).toHaveAttribute('aria-selected', 'true');
  });

  it('never selects a disabled tab', async () => {
    expect.assertions(1);
    withoutCanvas();
    render(<Topics />);
    await userEvent.click(tabNamed('Access'));
    expect(tabNamed('Tokens')).toHaveAttribute('aria-selected', 'true');
  });

  it('reports each change and its reason', async () => {
    expect.assertions(2);
    withoutCanvas();
    const onValueChange = vi.fn<(value: Topic | null, details: { reason: string }) => void>();
    render(<Topics onValueChange={onValueChange} />);
    await userEvent.click(tabNamed('Motion'));
    expect(onValueChange).toHaveBeenLastCalledWith('motion', expect.objectContaining({ reason: 'item-press' }));
    await userEvent.keyboard('{ArrowLeft}');
    expect(onValueChange).toHaveBeenLastCalledWith('tokens', expect.objectContaining({ reason: 'list-navigation' }));
  });

  it('follows a controlled value, and only that', async () => {
    expect.assertions(3);
    withoutCanvas();
    const onValueChange = vi.fn<(value: Topic | null) => void>();
    const { rerender } = render(<Topics value="motion" onValueChange={onValueChange} />);
    expect(tabNamed('Motion')).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(tabNamed('Tokens'));
    // It asks, but the value is yours.
    expect(tabNamed('Motion')).toHaveAttribute('aria-selected', 'true');
    rerender(<Topics value="tokens" onValueChange={onValueChange} />);
    expect(tabNamed('Tokens')).toHaveAttribute('aria-selected', 'true');
  });
});

describe(TabsList, () => {
  it('forwards refs, classNames and props to each part', () => {
    expect.assertions(5);
    withoutCanvas();
    const listRef = createRef<HTMLDivElement>();
    render(
      <Tabs defaultValue="a" className="my-tabs" data-testid="root">
        <TabsList ref={listRef} className="my-list" aria-label="Letters">
          <TabsTab value="a" className="my-tab">
            A
          </TabsTab>
        </TabsList>
        <TabsPanel value="a" className="my-panel">
          Alpha
        </TabsPanel>
      </Tabs>,
    );
    const list = screen.getByRole('tablist', { name: 'Letters' });
    expect(listRef.current).toBe(list);
    expect(screen.getByTestId('root')).toHaveClass('agar-tabs', 'my-tabs');
    expect(list).toHaveClass('agar-tabs-list', 'my-list');
    expect(tabNamed('A')).toHaveClass('agar-tabs-tab', 'my-tab');
    expect(screen.getByRole('tabpanel')).toHaveClass('agar-tabs-panel', 'my-panel');
  });

  it('runs the consumer’s pointer handlers', async () => {
    expect.assertions(1);
    withCanvas();
    const onPointerDown = vi.fn<(event: { type: string }) => void>();
    render(
      <Tabs defaultValue="a">
        <TabsList aria-label="Letters" onPointerDown={onPointerDown}>
          <TabsTab value="a">A</TabsTab>
        </TabsList>
      </Tabs>,
    );
    await userEvent.click(tabNamed('A'));
    expect(onPointerDown).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ type: 'pointerdown' }));
  });

  it('keeps the CSS indicator when there is no canvas to draw on', () => {
    expect.assertions(3);
    withoutCanvas();
    render(<Topics />);
    const list = screen.getByRole('tablist');
    expect(list).not.toHaveAttribute('data-jelly');
    expect(list.querySelector('.agar-tabs-indicator')).toBeInTheDocument();
    expect(list.querySelector('canvas')).toHaveAttribute('aria-hidden', 'true');
  });

  it('hands the indicator to the jelly when it can draw, and cleans up on unmount', () => {
    expect.assertions(3);
    withCanvas();
    const { unmount } = render(<Topics />);
    expect(screen.getByRole('tablist')).toHaveAttribute('data-jelly', 'ready');
    expect(surfaceCount()).toBe(1);
    unmount();
    expect(surfaceCount()).toBe(0);
  });
});
