import type { JSX } from 'react';

const theming = `.agar-button {
  --agar-button-height: 40px;
  --agar-button-padding: 18px;
  --agar-button-blur: 2px;
  --agar-button-text: light-dark(#171717, #fff);
  /* The plain pill, before the jelly draws and without a canvas. */
  --agar-button-frost: light-dark(rgb(255 255 255 / 0.6), rgb(0 0 0 / 0.5));
  --agar-button-edge: light-dark(rgb(0 0 0 / 0.1), rgb(255 255 255 / 0.15));
}`;

/** Themes and custom properties. */
export function Theming(): JSX.Element {
  return (
    <section aria-labelledby="theming">
      <h2 id="theming">Theming</h2>
      <p>
        Colours follow <code>color-scheme</code>: the OS setting, or <code>data-theme=&quot;light&quot;</code> or{' '}
        <code>&quot;dark&quot;</code> on <code>&lt;html&gt;</code>. The glass has no colour of its own: like a lens, it
        blurs what&apos;s behind it a little, shades it slightly and catches a bright line of light round its rim.
        Override the custom properties to resize the button, or change its blur or text colour. Check that the text
        keeps 4.5:1 against the glass. The glass&apos;s lighting follows{' '}
        <a href="https://github.com/bilalgursen/liquid-glass">liquid-glass</a> by Bilal Gürsen (MIT).
      </p>
      <pre>
        <code>{theming}</code>
      </pre>
    </section>
  );
}
