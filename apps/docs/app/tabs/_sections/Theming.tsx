import type { JSX } from 'react';

const theming = `.agar-tabs {
  --agar-tabs-list: light-dark(rgb(100 115 135 / 0.12), rgb(255 255 255 / 0.08));
  --agar-tabs-text: light-dark(#4b5563, #a7b0bd);
  --agar-tabs-text-selected: light-dark(#0b1b2b, #fff);
}`;

/** Colours, themes and custom properties. */
export function Theming(): JSX.Element {
  return (
    <section aria-labelledby="theming">
      <h2 id="theming">Theming</h2>
      <p>
        Colours follow <code>color-scheme</code>: the OS setting, or <code>data-theme=&quot;light&quot;</code> or{' '}
        <code>&quot;dark&quot;</code> on <code>&lt;html&gt;</code>. The jelly&apos;s tint palette, the dock&apos;s
        glassy tint, follows the same setting. Override the custom properties to restyle the list and labels:
      </p>
      <pre>
        <code>{theming}</code>
      </pre>
    </section>
  );
}
