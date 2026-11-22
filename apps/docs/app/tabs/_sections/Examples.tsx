import type { JSX } from 'react';

import type { DemoTab } from './TabsDemo';
import { TabsDemo } from './TabsDemo';

const topics: readonly DemoTab[] = [
  { value: 'tokens', label: 'Tokens', panel: 'Colour, spacing, radius and motion, in light and dark.' },
  { value: 'motion', label: 'Motion', panel: 'Springs, not tweens: every jelly settles on its own physics.' },
  { value: 'access', label: 'Access', panel: 'Behaviour and ARIA come from UI SDK. The canvas is decorative.' },
  { value: 'perf', label: 'Perf', panel: 'One WebGL context and one animation loop for the whole page.' },
];

const plans: readonly DemoTab[] = [
  { value: 'monthly', label: 'Monthly', panel: 'Billed every month. Cancel any time.' },
  { value: 'yearly', label: 'Yearly', panel: 'Billed once a year, with two months free.' },
  { value: 'team', label: 'Team (coming soon)', panel: 'Shared billing for a whole team.', disabled: true },
];

const settings: readonly DemoTab[] = [
  { value: 'profile', label: 'Profile', panel: 'Your name, photo and bio.' },
  { value: 'account', label: 'Account', panel: 'Email, password and sign-in methods.' },
  { value: 'privacy', label: 'Privacy', panel: 'Who can see your work, and what we keep.' },
];

/** Live tabs: the default, one with a disabled tab, and a vertical list. */
export function Examples(): JSX.Element {
  return (
    <section aria-labelledby="examples" className="demo">
      <h2 id="examples">Examples</h2>
      <TabsDemo label="Agar topics" tabs={topics} defaultValue="tokens" />
      <TabsDemo label="Billing plans" tabs={plans} defaultValue="yearly" />
      <TabsDemo label="Settings" tabs={settings} defaultValue="profile" orientation="vertical" />
    </section>
  );
}
