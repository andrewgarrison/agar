import type { Metadata } from 'next';
import Link from 'next/link';
import type { JSX } from 'react';

import { Accessibility } from './_sections/Accessibility';
import { Examples } from './_sections/Examples';
import { Guidelines } from './_sections/Guidelines';
import { Theming } from './_sections/Theming';
import { Usage } from './_sections/Usage';

export const metadata: Metadata = {
  title: 'Popover · Agar',
  description: 'A small task in a floating glass panel that grows out of its trigger.',
};

export default function PopoverPage(): JSX.Element {
  return (
    <main>
      <p>
        <Link href="/">Agar</Link>
      </p>
      <h1>Popover</h1>
      <p>
        Keep a small task beside the thing it belongs to: a short explanation, a setting or two, a quick form. The panel
        grows out of its trigger and shrinks back into it. For anything that needs the whole screen, or must be answered
        before going on, use a dialog.
      </p>

      <Examples />
      <Usage />
      <Guidelines />
      <Accessibility />
      <Theming />
    </main>
  );
}
