import type { JSX } from 'react';

const theming = `.agar-popover {
  --agar-popover-width: 18rem;
  --agar-popover-text: light-dark(#0b1b2b, #fff);
  --agar-popover-muted: light-dark(#1e3448, rgb(255 255 255 / 0.82));
}`;

/** Colours, themes and custom properties. */
export function Theming(): JSX.Element {
  return (
    <section aria-labelledby="theming">
      <h2 id="theming">Theming</h2>
      <p>
        Colours follow <code>color-scheme</code>: the OS setting, or <code>data-theme=&quot;light&quot;</code> or{' '}
        <code>&quot;dark&quot;</code> on <code>&lt;html&gt;</code>. The jelly&apos;s glass palette follows the same
        setting. Override the custom properties to resize the panel and recolour its text:
      </p>
      <pre>
        <code>{theming}</code>
      </pre>
    </section>
  );
}
