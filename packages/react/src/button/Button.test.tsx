import { surfaceCount } from '@agar/core';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './Button';

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

function formIn(element: HTMLElement): HTMLFormElement {
  if (!(element instanceof HTMLFormElement)) {
    throw new TypeError('expected a form');
  }
  return element;
}

function renderForm(): HTMLFormElement {
  render(
    <form data-testid="form">
      <input aria-label="Email" name="email" defaultValue="ada@example.com" />
      <Button type="submit">Subscribe</Button>
      <Button type="reset">Reset</Button>
    </form>,
  );
  return formIn(screen.getByTestId('form'));
}

// Presses with the pointer and with Space, then moves focus away.
function pressEveryWay(button: HTMLElement): void {
  fireEvent.pointerDown(button, { button: 0 });
  fireEvent.pointerUp(button);
  fireEvent.keyDown(button, { key: ' ' });
  fireEvent.keyUp(button, { key: ' ' });
  fireEvent.blur(button);
}

describe(Button, () => {
  it('is named by its content and runs its action on click', async () => {
    expect.assertions(2);
    withoutCanvas();
    const onClick = vi.fn<() => void>();
    render(<Button onClick={onClick}>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveAttribute('type', 'button');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ type: 'click' }), expect.anything());
  });

  it('runs with Enter and Space', async () => {
    expect.assertions(1);
    withoutCanvas();
    const onClick = vi.fn<() => void>();
    render(<Button onClick={onClick}>Save</Button>);
    screen.getByRole('button', { name: 'Save' }).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('does nothing when disabled, and leaves the tab order', async () => {
    expect.assertions(2);
    withoutCanvas();
    const onClick = vi.fn<() => void>();
    render(
      <Button onClick={onClick} disabled>
        Publish
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Publish' });
    await userEvent.click(button);
    await userEvent.tab();
    expect(onClick).not.toHaveBeenCalled();
    expect(button).not.toHaveFocus();
  });

  it('stays focusable when asked, and still does nothing', async () => {
    expect.assertions(3);
    withoutCanvas();
    const onClick = vi.fn<() => void>();
    render(
      <Button onClick={onClick} disabled focusableWhenDisabled>
        Publish
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Publish' });
    await userEvent.tab();
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    await userEvent.keyboard('{Enter}');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('resets its form', async () => {
    expect.assertions(1);
    withoutCanvas();
    renderForm();
    const email = screen.getByRole('textbox', { name: 'Email' });
    await userEvent.clear(email);
    await userEvent.type(email, 'grace@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(email).toHaveValue('ada@example.com');
  });

  it('submits its form', async () => {
    expect.assertions(1);
    withoutCanvas();
    const onSubmit = vi.fn<(event: SubmitEvent) => void>((event) => {
      event.preventDefault();
    });
    renderForm().addEventListener('submit', onSubmit);
    await userEvent.click(screen.getByRole('button', { name: 'Subscribe' }));
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ type: 'submit' }));
  });
});

describe('Button jelly', () => {
  it('forwards its ref, className and props', () => {
    expect.assertions(3);
    withoutCanvas();
    const ref = createRef<HTMLButtonElement>();
    render(
      <Button ref={ref} className="mine" aria-label="Close">
        <span aria-hidden="true">×</span>
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Close' });
    expect(ref.current).toBe(button);
    expect(button).toHaveClass('agar-button', 'mine');
    expect(button.querySelector('canvas')).toHaveAttribute('aria-hidden', 'true');
  });

  it("runs the consumer's handlers", () => {
    expect.assertions(1);
    withCanvas();
    const handlers = {
      onPointerDown: vi.fn<() => void>(),
      onPointerUp: vi.fn<() => void>(),
      onKeyDown: vi.fn<() => void>(),
      onKeyUp: vi.fn<() => void>(),
      onBlur: vi.fn<() => void>(),
    };
    render(<Button {...handlers}>Save</Button>);
    pressEveryWay(screen.getByRole('button', { name: 'Save' }));
    expect(Object.values(handlers).map((handler) => handler.mock.calls.length)).toStrictEqual([1, 1, 1, 1, 1]);
  });

  it('keeps the plain fill when there is no canvas to draw on', () => {
    expect.assertions(1);
    withoutCanvas();
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).not.toHaveAttribute('data-jelly');
  });

  it('hands the fill to the jelly when it can draw, and cleans up on unmount', () => {
    expect.assertions(3);
    withCanvas();
    const { unmount } = render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('data-jelly', 'ready');
    expect(surfaceCount()).toBe(1);
    unmount();
    expect(surfaceCount()).toBe(0);
  });
});
