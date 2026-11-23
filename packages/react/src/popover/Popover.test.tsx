import { surfaceCount } from '@agar/core';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import type { JSX } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PopoverProps } from './index';
import { Popover, PopoverClose, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from './index';

// After a close, UI SDK checks once more in a timer that focus went back to
// the trigger. Let it run inside the test, or it fires after this file's
// jsdom is gone.
afterEach(async () => {
  let drained = false;
  setTimeout(() => {
    drained = true;
  }, 0);
  await waitFor(() => {
    if (!drained) {
      throw new Error('UI SDK’s focus check is still pending');
    }
  });
});

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

function Rename(props: Omit<PopoverProps, 'children'>): JSX.Element {
  return (
    <Popover {...props}>
      <PopoverTrigger>Rename</PopoverTrigger>
      <PopoverContent>
        <PopoverTitle>Rename the palette</PopoverTitle>
        <PopoverDescription>Names show in the token export.</PopoverDescription>
        <label>
          Name <input defaultValue="Glass" />
        </label>
        <PopoverClose>Save</PopoverClose>
      </PopoverContent>
    </Popover>
  );
}

function trigger(): HTMLElement {
  return screen.getByRole('button', { name: 'Rename' });
}

function focused(): HTMLElement {
  const element = document.activeElement;
  if (!(element instanceof HTMLElement)) {
    throw new TypeError('nothing is focused');
  }
  return element;
}

describe(Popover, () => {
  it('opens a dialog named by its title, and moves focus in', async () => {
    expect.assertions(5);
    withoutCanvas();
    render(<Rename />);
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger());
    const dialog = screen.getByRole('dialog', { name: 'Rename the palette' });
    expect(dialog).toHaveAccessibleDescription('Names show in the token export.');
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(trigger()).toHaveAttribute('aria-controls', dialog.id);
    // Without layout, UI SDK finds no field it can show focus on in jsdom, and
    // focuses the panel. Browsers focus the field (e2e/popover.spec.ts).
    expect(dialog).toContainElement(focused());
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    expect.assertions(2);
    withoutCanvas();
    render(<Rename />);
    await userEvent.click(trigger());
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it('closes from a PopoverClose, and reports why', async () => {
    expect.assertions(3);
    withoutCanvas();
    const onOpenChange = vi.fn<(open: boolean, details: { reason: string }) => void>();
    render(<Rename onOpenChange={onOpenChange} />);
    await userEvent.click(trigger());
    expect(onOpenChange).toHaveBeenLastCalledWith(true, expect.objectContaining({ reason: 'trigger-press' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false, expect.objectContaining({ reason: 'close-press' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('follows a controlled open, and only that', async () => {
    expect.assertions(3);
    withoutCanvas();
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const { rerender } = render(<Rename open onOpenChange={onOpenChange} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    // It asks, but the state is yours.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    rerender(<Rename open={false} onOpenChange={onOpenChange} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stays open while not dismissible, and reports the attempt', async () => {
    expect.assertions(2);
    withoutCanvas();
    const onDismissAttempt = vi.fn<(details: { reason: string }) => void>();
    render(<Rename dismissible={false} onDismissAttempt={onDismissAttempt} />);
    await userEvent.click(trigger());
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onDismissAttempt).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ reason: 'escape-key' }));
  });

  it('keeps what was typed between opens', async () => {
    expect.assertions(1);
    withoutCanvas();
    render(<Rename />);
    await userEvent.click(trigger());
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), ' tint');
    await userEvent.keyboard('{Escape}');
    await userEvent.click(trigger());
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Glass tint');
  });
});

describe(PopoverContent, () => {
  it('forwards refs and classNames to the trigger and content', async () => {
    expect.assertions(4);
    withoutCanvas();
    const triggerRef = createRef<HTMLButtonElement>();
    const contentRef = createRef<HTMLDivElement>();
    render(
      <Popover defaultOpen>
        <PopoverTrigger ref={triggerRef} className="my-trigger">
          Open
        </PopoverTrigger>
        <PopoverContent ref={contentRef} className="my-content">
          <PopoverTitle>Title</PopoverTitle>
        </PopoverContent>
      </Popover>,
    );
    const dialog = await screen.findByRole('dialog');
    expect(triggerRef.current).toHaveClass('agar-popover-trigger', 'my-trigger');
    expect(contentRef.current).toBe(dialog);
    expect(dialog).toHaveClass('agar-popover', 'my-content');
    expect(dialog.querySelector('.agar-jelly-canvas')).toBeInTheDocument();
  });

  it('forwards classNames to the title, description and close button', async () => {
    expect.assertions(3);
    withoutCanvas();
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>
          <PopoverTitle className="my-title">Title</PopoverTitle>
          <PopoverDescription className="my-description">Description</PopoverDescription>
          <PopoverClose className="my-close">Close</PopoverClose>
        </PopoverContent>
      </Popover>,
    );
    await screen.findByRole('dialog');
    expect(screen.getByRole('heading', { name: 'Title' })).toHaveClass('agar-popover-title', 'my-title');
    expect(screen.getByText('Description')).toHaveClass('agar-popover-description', 'my-description');
    expect(screen.getByRole('button', { name: 'Close' })).toHaveClass('agar-popover-close', 'my-close');
  });

  it('keeps the plain panel when there is no canvas to draw on', async () => {
    expect.assertions(2);
    withoutCanvas();
    render(<Rename />);
    await userEvent.click(trigger());
    const dialog = screen.getByRole('dialog');
    expect(dialog).not.toHaveAttribute('data-jelly');
    expect(dialog.querySelector('canvas')).toHaveAttribute('aria-hidden', 'true');
  });

  it('hands the panel to the jelly when it can draw, and cleans up on unmount', () => {
    expect.assertions(3);
    withCanvas();
    const { container, unmount } = render(<Rename />);
    // The panel stays in the page while closed, so the jelly is ready before the first open.
    expect(container.ownerDocument.querySelector('.agar-popover')).toHaveAttribute('data-jelly', 'ready');
    expect(surfaceCount()).toBe(1);
    unmount();
    expect(surfaceCount()).toBe(0);
  });

  it('must be inside a Popover', () => {
    expect.assertions(2);
    withoutCanvas();
    vi.spyOn(console, 'error').mockReturnValue(undefined);
    expect(() => render(<PopoverContent />)).toThrow('<PopoverContent> must be inside a <Popover>');
    expect(() => render(<PopoverTrigger />)).toThrow('<PopoverTrigger> must be inside a <Popover>');
  });
});
