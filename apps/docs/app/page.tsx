import { VisuallyHidden } from '@agar/react/visually-hidden';
import Link from 'next/link';
import type { JSX } from 'react';

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
          <Link href="/switch">Switch</Link>
        </li>
      </ul>
    </main>
  );
}
