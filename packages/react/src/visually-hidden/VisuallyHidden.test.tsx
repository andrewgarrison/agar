import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { VisuallyHidden } from './VisuallyHidden';

describe(VisuallyHidden, () => {
  it('stays in the accessibility tree', () => {
    expect.assertions(1);
    render(
      <button type="button">
        <span aria-hidden="true">×</span>
        <VisuallyHidden>Close</VisuallyHidden>
      </button>,
    );
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('merges className and forwards props', () => {
    expect.assertions(1);
    render(<VisuallyHidden className="extra" data-testid="vh" />);
    expect(screen.getByTestId('vh')).toHaveClass('agar-visually-hidden', 'extra');
  });
});
