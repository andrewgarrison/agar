import type { JSX } from 'react';

const keys = [
  { key: 'Tab', does: 'Moves to the switch' },
  { key: 'Space', does: 'Turns it on or off' },
  { key: 'Enter', does: 'Submits its form, and never toggles it' },
];

/** Keyboard support and what assistive technology gets. */
export function Accessibility(): JSX.Element {
  return (
    <section aria-labelledby="accessibility">
      <h2 id="accessibility">Accessibility</h2>
      <p>
        The behaviour comes from UI SDK and follows the WAI-ARIA switch pattern: a button with the <code>switch</code>{' '}
        role, and a hidden checkbox for forms.
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
        The jelly thumb is an <code>aria-hidden</code> canvas that ignores the pointer. Until it&apos;s ready, and
        whenever it can&apos;t draw, a plain CSS thumb shows instead. With reduced motion, the thumb moves without
        wobbling. In forced-colours mode the system-coloured thumb replaces the jelly.
      </p>
    </section>
  );
}
