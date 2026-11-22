import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

// The jsdom environment has no Popover API: every `[popover]` element stays
// `display: none`, so an open popover looks hidden to Testing Library. Show
// the ones UI SDK has opened, as `showPopover()` would in a browser.
function showOpenPopups(): void {
  if (
    typeof document === 'undefined' ||
    typeof HTMLElement.prototype.showPopover === 'function' ||
    document.querySelector('style[data-popover-stub]') !== null
  ) {
    return;
  }
  const style = document.createElement('style');
  style.dataset.popoverStub = '';
  style.textContent = '[popover][data-open] { display: block; }';
  document.head.append(style);
}

// The jsdom environment has no Web Animations. UI SDK asks for an element's
// running animations before it unmounts closing content (a tab panel, a
// popover), so report none and let it finish at once, as a browser with no
// animations does.
beforeEach(() => {
  if (typeof Element !== 'undefined' && typeof Element.prototype.getAnimations !== 'function') {
    Element.prototype.getAnimations = (): Animation[] => [];
  }
  showOpenPopups();
});

afterEach(() => {
  cleanup();
});
