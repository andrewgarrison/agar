import { VisuallyHidden } from '@agar/react/visually-hidden';
import Link from 'next/link';
import type { JSX } from 'react';

const theme = `:root {
  --agar-accent: light-dark(#7e22ce, #9333ea);
  --agar-accent-text: #fff;
  --agar-focus: light-dark(#7e22ce, #d8b4fe);
}`;

export default function Home(): JSX.Element {
  return (
    <main>
      <h1>Agar</h1>
      <p>Accessible React components with soft-body jelly surfaces.</p>
      <button type="button">
        <span aria-hidden="true">★</span>
        <VisuallyHidden>Star Agar</VisuallyHidden>
      </button>
      <h2>Components</h2>
      <ul>
        <li>
          <Link href="/button">Button</Link>
        </li>
        <li>
          <Link href="/popover">Popover</Link>
        </li>
        <li>
          <Link href="/switch">Switch</Link>
        </li>
        <li>
          <Link href="/tabs">Tabs</Link>
        </li>
      </ul>
      <h2>Theming</h2>
      <p>
        Agar&apos;s accent is grape. Every component reads three custom properties, so set them on <code>:root</code> to
        re-theme the whole system, or on any element to re-theme what&apos;s inside it. Keep 4.5:1 between the accent
        and its text, and 3:1 between the focus ring and the page.
      </p>
      <pre>
        <code>{theme}</code>
      </pre>
    </main>
  );
}
