import type { Metadata } from 'next';
import Link from 'next/link';
import type { JSX } from 'react';

import { Accessibility } from './_sections/Accessibility';
import { Examples } from './_sections/Examples';
import { Guidelines } from './_sections/Guidelines';
import { Theming } from './_sections/Theming';
import { Usage } from './_sections/Usage';

export const metadata: Metadata = {
  title: 'Switch · Agar',
  description: 'Turn a setting on or off, with a jelly thumb.',
};

export default function SwitchPage(): JSX.Element {
  return (
    <main>
      <p>
        <Link href="/">Agar</Link>
      </p>
      <h1>Switch</h1>
      <p>
        Turn a setting on or off. Use a switch for a setting that takes effect as soon as it changes. For a choice that
        only applies when a form is submitted, use a checkbox.
      </p>

      <Examples />
      <Usage />
      <Guidelines />
      <Accessibility />
      <Theming />
    </main>
  );
}
