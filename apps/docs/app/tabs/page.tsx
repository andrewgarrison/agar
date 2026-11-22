import type { Metadata } from 'next';
import Link from 'next/link';
import type { JSX } from 'react';

import { Accessibility } from './_sections/Accessibility';
import { Examples } from './_sections/Examples';
import { Guidelines } from './_sections/Guidelines';
import { Theming } from './_sections/Theming';
import { Usage } from './_sections/Usage';

export const metadata: Metadata = {
  title: 'Tabs · Agar',
  description: 'Layered sections of content, one at a time, with a jelly that springs to the selected tab.',
};

export default function TabsPage(): JSX.Element {
  return (
    <main>
      <p>
        <Link href="/">Agar</Link>
      </p>
      <h1>Tabs</h1>
      <p>
        Show one of several related sections at a time, in the same place. Use tabs when people move between the
        sections without leaving the page. For steps that go in order, or pages of their own, use something else.
      </p>

      <Examples />
      <Usage />
      <Guidelines />
      <Accessibility />
      <Theming />
    </main>
  );
}
