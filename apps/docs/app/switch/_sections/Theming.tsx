import type { JSX } from 'react';

const theming = `.agar-switch {
  --agar-switch-track: light-dark(#6e7889, #4a5466);
  --agar-switch-track-checked: light-dark(#1f5fd1, #3b7be8);
}`;

/** Colours, themes and custom properties. */
export function Theming(): JSX.Element {
  return (
    <section aria-labelledby="theming">
      <h2 id="theming">Theming</h2>
      <p>
        Colours follow <code>color-scheme</code>: the OS setting, or <code>data-theme=&quot;light&quot;</code> or{' '}
        <code>&quot;dark&quot;</code> on <code>&lt;html&gt;</code>. The jelly&apos;s milk palette follows the same
        setting. Override the custom properties to restyle the track:
      </p>
      <pre>
        <code>{theming}</code>
      </pre>
    </section>
  );
}
