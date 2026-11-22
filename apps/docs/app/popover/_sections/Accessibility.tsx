import type { JSX } from 'react';

const keys = [
  { key: 'Enter / Space', does: 'On the trigger, opens or closes the popover' },
  { key: 'Tab', does: 'Moves through the panel, then on to whatever follows the trigger, closing it' },
  { key: 'Shift + Tab', does: 'From the first thing in the panel, back to the trigger' },
  { key: 'Escape', does: 'Closes it and returns focus to the trigger' },
];

/** Keyboard support and what assistive technology gets. */
export function Accessibility(): JSX.Element {
  return (
    <section aria-labelledby="accessibility">
      <h2 id="accessibility">Accessibility</h2>
      <p>
        The behaviour comes from UI SDK. The trigger is a button with <code>aria-expanded</code>, and the panel is a
        non-modal <code>dialog</code> named by its title and described by its description. Opening moves focus to the
        first thing in the panel; closing returns it to the trigger. With <code>modal</code>, focus stays inside and the
        rest of the page is inert.
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
        The jelly is an <code>aria-hidden</code> canvas that ignores the pointer. Its glass is nearly opaque, so text
        keeps 4.5:1 over a plain page; over busy content, a little of what&apos;s behind shows through. Until the jelly
        is ready, and whenever it can&apos;t draw, a plain frosted panel shows instead. With reduced motion, the panel
        appears and disappears without growing or wobbling. In forced-colours mode a system-coloured panel replaces it.
      </p>
    </section>
  );
}
