import type { JSX } from 'react';

const keys = [
  { key: 'Tab', does: 'Moves to the button, unless it is disabled' },
  { key: 'Enter', does: 'Presses it' },
  { key: 'Space', does: 'Presses it when released' },
];

/** Keyboard support and what assistive technology gets. */
export function Accessibility(): JSX.Element {
  return (
    <section aria-labelledby="accessibility">
      <h2 id="accessibility">Accessibility</h2>
      <p>
        The behaviour comes from UI SDK: a native <code>&lt;button&gt;</code>. While its action runs, it sets{' '}
        <code>aria-busy</code> and <code>aria-disabled</code>, keeps focus, and after a second announces{' '}
        <code>pendingAnnouncement</code> through a polite live region.
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
        can&apos;t draw, a pill of frosted glass shows instead. With reduced motion, the squish doesn&apos;t wobble and
        the pending button doesn&apos;t breathe. With reduced transparency, the glass turns opaque. In forced-colours
        mode a system-coloured button replaces the glass.
      </p>
      <p>
        On the page&apos;s own background, the label keeps 4.5:1 against the glass in both themes. Over a picture,
        contrast depends on the picture: check it.
      </p>
    </section>
  );
}
