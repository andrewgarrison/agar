import { surfaceCount } from '@agar/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Switch } from './Switch';
import { SwitchThumb } from './SwitchThumb';

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

function formIn(element: HTMLElement): HTMLFormElement {
  if (!(element instanceof HTMLFormElement)) {
    throw new TypeError('expected a form');
  }
  return element;
}

function withoutCanvas(): void {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
}

function renderSwitch(props: Parameters<typeof Switch>[0] = {}): HTMLElement {
  render(
    <label>
      Airplane mode
      <Switch {...props} />
    </label>,
  );
  return screen.getByRole('switch', { name: 'Airplane mode' });
}

describe(Switch, () => {
  it('is named by its label and toggles on click', async () => {
    expect.assertions(3);
    withoutCanvas();
    const control = renderSwitch();
    expect(control).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(control);
    expect(control).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByText('Airplane mode'));
    expect(control).toHaveAttribute('aria-checked', 'false');
  });

  it('toggles with Space, never with Enter', async () => {
    expect.assertions(2);
    withoutCanvas();
    const control = renderSwitch();
    control.focus();
    await userEvent.keyboard('{Enter}');
    expect(control).toHaveAttribute('aria-checked', 'false');
    await userEvent.keyboard(' ');
    expect(control).toHaveAttribute('aria-checked', 'true');
  });

  it('reports each change and its reason', async () => {
    expect.assertions(1);
    withoutCanvas();
    const onCheckedChange = vi.fn<(checked: boolean, details: { reason: string }) => void>();
    const control = renderSwitch({ onCheckedChange });
    await userEvent.click(control);
    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true, expect.objectContaining({ reason: 'press' }));
  });

  it('stays put when disabled or read-only', async () => {
    expect.assertions(2);
    withoutCanvas();
    render(
      <>
        <label>
          Disabled
          <Switch disabled />
        </label>
        <label>
          Read-only
          <Switch readOnly defaultChecked />
        </label>
      </>,
    );
    await userEvent.click(screen.getByRole('switch', { name: 'Disabled' }));
    await userEvent.click(screen.getByRole('switch', { name: 'Read-only' }));
    expect(screen.getByRole('switch', { name: 'Disabled' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('switch', { name: 'Read-only' })).toHaveAttribute('aria-checked', 'true');
  });

  it('submits its name and value while on', async () => {
    expect.assertions(2);
    withoutCanvas();
    render(
      <form data-testid="form">
        <label>
          Weekly digest
          <Switch name="digest" value="weekly" />
        </label>
      </form>,
    );
    const form = formIn(screen.getByTestId('form'));
    expect(new FormData(form).get('digest')).toBeNull();
    await userEvent.click(screen.getByRole('switch', { name: 'Weekly digest' }));
    expect(new FormData(form).get('digest')).toBe('weekly');
  });

  it('forwards its ref, className and props', () => {
    expect.assertions(3);
    withoutCanvas();
    const ref = createRef<HTMLButtonElement>();
    render(<Switch ref={ref} className="mine" aria-label="Wi-Fi" />);
    const control = screen.getByRole('switch', { name: 'Wi-Fi' });
    expect(ref.current).toBe(control);
    expect(control).toHaveClass('agar-switch', 'mine');
    expect(control.querySelector('canvas')).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps the CSS thumb when there is no canvas to draw on', () => {
    expect.assertions(2);
    withoutCanvas();
    const control = renderSwitch();
    expect(control).not.toHaveAttribute('data-jelly');
    expect(control.querySelector('.agar-switch-thumb')).toBeInTheDocument();
  });

  it('hands the thumb to the jelly when it can draw, and cleans up on unmount', () => {
    expect.assertions(3);
    withCanvas();
    const { unmount } = render(<Switch aria-label="Wi-Fi" />);
    expect(screen.getByRole('switch', { name: 'Wi-Fi' })).toHaveAttribute('data-jelly', 'ready');
    expect(surfaceCount()).toBe(1);
    unmount();
    expect(surfaceCount()).toBe(0);
  });

  it('takes a custom thumb', () => {
    expect.assertions(1);
    withoutCanvas();
    render(
      <Switch aria-label="Wi-Fi">
        <SwitchThumb className="my-thumb" />
      </Switch>,
    );
    expect(screen.getByRole('switch', { name: 'Wi-Fi' }).querySelector('.agar-switch-thumb')).toHaveClass('my-thumb');
  });
});

describe(SwitchThumb, () => {
  it('must be inside a Switch', () => {
    expect.assertions(1);
    vi.spyOn(console, 'error').mockReturnValue(undefined);
    expect(() => render(<SwitchThumb />)).toThrow('inside a <Switch>');
  });
});
