import type { JSX } from 'react';

const keys = [
  { key: 'Tab', does: 'Moves into the tab list, onto the selected tab, then on to its panel' },
  { key: 'Left / Right', does: 'Moves between tabs (Up and Down when vertical), wrapping at the ends' },
  { key: 'Home / End', does: 'Moves to the first or last tab' },
  { key: 'Enter / Space', does: 'Selects the focused tab, with manual activation' },
];

/** Keyboard support and what assistive technology gets. */
export function Accessibility(): JSX.Element {
  return (
    <section aria-labelledby="accessibility">
      <h2 id="accessibility">Accessibility</h2>
      <p>
        The behaviour comes from UI SDK and follows the WAI-ARIA tabs pattern: a <code>tablist</code> of{' '}
        <code>tab</code>s with one tab stop, each tab linked to its <code>tabpanel</code>. Arrow keys still reach a
        disabled tab, so its label can be read, but it can&apos;t be selected. With automatic activation, moving focus
        selects the tab.
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">Key</th>
            <th scope="col">Does</th>
          </tr>
        </thead>
        <tbody>
          {keys.map(({ key, does }) => (
            <tr key={key}>
              <td>{key}</td>
              <td>{does}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        The jelly is an <code>aria-hidden</code> canvas that ignores the pointer. Until it&apos;s ready, and whenever it
        can&apos;t draw, a plain CSS pill marks the selected tab instead. The selected tab&apos;s text is also darker
        (lighter in dark mode), so the selection shows without either. With reduced motion, the jelly moves without
        wobbling. In forced-colours mode a system-coloured pill replaces it.
      </p>
    </section>
  );
}
