import type { JSX } from 'react';

/** Do's and don'ts. */
export function Guidelines(): JSX.Element {
  return (
    <section aria-labelledby="guidelines">
      <h2 id="guidelines">Do&apos;s and don&apos;ts</h2>
      <ul>
        <li>Do keep the label the same in both states. The label names the setting; the switch shows its state.</li>
        <li>Do apply the change immediately. If it needs a Save button, use a checkbox instead.</li>
        <li>
          Don&apos;t write &ldquo;on&rdquo; or &ldquo;off&rdquo; into the label, or change the label when it toggles.
        </li>
        <li>Don&apos;t rely on the jelly to say anything. It&apos;s decoration: the state is in the markup.</li>
        <li>
          Use <code>readOnly</code>, not <code>disabled</code>, for a setting that&apos;s managed elsewhere, so keyboard
          users can still reach it and read its state.
        </li>
      </ul>
    </section>
  );
}
