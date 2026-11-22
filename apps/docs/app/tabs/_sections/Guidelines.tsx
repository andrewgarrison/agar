import type { JSX } from 'react';

/** Do's and don'ts. */
export function Guidelines(): JSX.Element {
  return (
    <section aria-labelledby="guidelines">
      <h2 id="guidelines">Do&apos;s and don&apos;ts</h2>
      <ul>
        <li>Do keep tab labels short, one or two words, so the row fits without wrapping.</li>
        <li>Do keep the sections parallel: views of the same thing, that people can visit in any order.</li>
        <li>Don&apos;t use tabs for steps that must go in order. Use a stepper or separate pages instead.</li>
        <li>Don&apos;t use tabs as site navigation. Links that change the URL belong in a nav, not a tablist.</li>
        <li>Don&apos;t rely on the jelly to say anything. It&apos;s decoration: the selection is in the markup.</li>
        <li>Don&apos;t hide a tab that&apos;s unavailable; disable it, and say why in its label or nearby.</li>
      </ul>
    </section>
  );
}
