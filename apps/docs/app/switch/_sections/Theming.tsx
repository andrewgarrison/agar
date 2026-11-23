import type { JSX } from 'react';

const jelly = `.agar-switch {
  --agar-jelly-tint: light-dark(#fff, #e8ecf2);
}`;

const theming = `.agar-switch {
  --agar-switch-track: light-dark(rgb(100 115 135 / 0.2), rgb(255 255 255 / 0.1));
  --agar-switch-track-checked: light-dark(#0284c7, #2563eb);
  --agar-switch-edge: light-dark(#7b8594, #737d8c);
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
      <p>
        Set <code>--agar-jelly-tint</code> to recolour the jelly itself, with any CSS colour, including{' '}
        <code>light-dark()</code> and alpha. <code>--agar-jelly-tint-bottom</code> adds a gradient. The jelly keeps its
        highlights and shadow. It reads the colour when it mounts and when the theme changes.
      </p>
      <pre>
        <code>{jelly}</code>
      </pre>
    </section>
  );
}
