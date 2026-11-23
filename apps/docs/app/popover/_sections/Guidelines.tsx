import type { JSX } from 'react';

/** Do's and don'ts. */
export function Guidelines(): JSX.Element {
  return (
    <section aria-labelledby="guidelines">
      <h2 id="guidelines">Do&apos;s and don&apos;ts</h2>
      <ul>
        <li>Do keep it small: a few lines of text, or a field or two. Bigger tasks belong in a dialog or a page.</li>
        <li>Do always give it a title, even a short one. It&apos;s what a screen reader announces.</li>
        <li>Do label the trigger with what opens, like &ldquo;Rename&rdquo;, not &ldquo;More&rdquo;.</li>
        <li>
          Don&apos;t use a popover for a hint that shows on hover. That&apos;s a tooltip, and it holds no controls.
        </li>
        <li>Don&apos;t put the only way to do something important in a popover that people might not open.</li>
        <li>
          Don&apos;t rely on the jelly to say anything. It&apos;s decoration: the panel works the same without it.
        </li>
      </ul>
    </section>
  );
}
