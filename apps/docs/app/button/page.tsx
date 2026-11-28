import type { Metadata } from 'next';
import Link from 'next/link';
import type { JSX } from 'react';

import { Accessibility } from './_sections/Accessibility';
import { Examples } from './_sections/Examples';
import { Guidelines } from './_sections/Guidelines';
import { Theming } from './_sections/Theming';
import { Usage } from './_sections/Usage';

export const metadata: Metadata = {
  title: 'Button · Agar',
  description: 'Run an action, on jelly glass that squishes when pressed.',
};

export default function ButtonPage(): JSX.Element {
  return (
    <main>
      <p>
        <Link href="/">Agar</Link>
      </p>
      <h1>Button</h1>
      <p>
        Run an action. It&apos;s jelly glass: it frosts what&apos;s behind it, squishes while it&apos;s pressed, by
        pointer or key, and breathes while an action it started is still running. To go somewhere else, use a link.
      </p>

      <Examples />
      <Usage />
      <Guidelines />
      <Accessibility />
      <Theming />
    </main>
  );
}
