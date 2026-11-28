import type { JSX } from 'react';

/** Do's and don'ts. */
export function Guidelines(): JSX.Element {
  return (
    <section aria-labelledby="guidelines">
      <h2 id="guidelines">Do&apos;s and don&apos;ts</h2>
      <ul>
        <li>Do name the action with a verb: &ldquo;Save changes&rdquo;, not &ldquo;OK&rdquo;.</li>
        <li>
          Don&apos;t put the glass over a busy, high-contrast picture. The frost softens what&apos;s behind it, but the
          label can still lose contrast. Give it a calmer backdrop.
        </li>
        <li>
          Do keep the label the same while pending, and change only an icon. Screen readers hear{' '}
          <code>pendingAnnouncement</code> instead.
        </li>
        <li>
          Use <code>focusableWhenDisabled</code> with <code>aria-describedby</code> when people need to find out why an
          action is unavailable.
        </li>
        <li>Don&apos;t use a button to go to another page. Use a link.</li>
        <li>
          Don&apos;t give an icon-only button no name. Add an <code>aria-label</code>, and hide the icon with{' '}
          <code>aria-hidden</code>.
        </li>
        <li>Don&apos;t rely on the jelly to say anything. It&apos;s decoration: the state is in the markup.</li>
      </ul>
    </section>
  );
}
