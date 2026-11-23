import type { JSX } from 'react';

const jelly = `.agar-popover {
  --agar-jelly-tint: light-dark(#d6f5e6, #124234);
  /* Optional: a gradient down the panel. */
  --agar-jelly-tint-bottom: light-dark(#c3ecd9, #0d3328);
  /* Keep text at 4.5:1 on your colour. */
  --agar-popover-text: light-dark(#0b2b1f, #fff);
}`;

const theming = `.agar-popover {
  --agar-popover-width: 18rem;
  --agar-popover-text: light-dark(#0b1b2b, #fff);
  --agar-popover-muted: light-dark(#3d4654, rgb(255 255 255 / 0.78));
}`;

/** Colours, themes and custom properties. */
export function Theming(): JSX.Element {
  return (
    <section aria-labelledby="theming">
      <h2 id="theming">Theming</h2>
      <p>
        By default the panel is plain: white in light mode, charcoal in dark. Colours follow <code>color-scheme</code>:
        the OS setting, or <code>data-theme=&quot;light&quot;</code> or <code>&quot;dark&quot;</code> on{' '}
        <code>&lt;html&gt;</code>.
      </p>
      <p>
        Set <code>--agar-jelly-tint</code> to change the panel&apos;s colour. It takes any CSS colour, including{' '}
        <code>light-dark()</code> and alpha, and recolours both the jelly and the plain panel that shows without it. Set
        it on one popover with <code>className</code>, or on <code>.agar-popover</code> for all of them. The jelly keeps
        its highlights and shadow, and reads the colour when it mounts and when the theme changes.
      </p>
      <pre>
        <code>{jelly}</code>
      </pre>
      <p>Override the other custom properties to resize the panel and recolour its text:</p>
      <pre>
        <code>{theming}</code>
      </pre>
    </section>
  );
}
