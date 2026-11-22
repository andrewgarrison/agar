import type { JSX } from 'react';

const usage = `import { Tabs, TabsList, TabsPanel, TabsTab } from '@agar/react/tabs';
import '@agar/react/styles.css';

<Tabs defaultValue="tokens">
  <TabsList aria-label="Agar topics">
    <TabsTab value="tokens">Tokens</TabsTab>
    <TabsTab value="motion">Motion</TabsTab>
  </TabsList>
  <TabsPanel value="tokens">Colour, spacing, radius and motion.</TabsPanel>
  <TabsPanel value="motion">Springs, not tweens.</TabsPanel>
</Tabs>`;

const controlled = `const [tab, setTab] = useState<'tokens' | 'motion'>('tokens');

<Tabs value={tab} onValueChange={(next) => next && setTab(next)}>
  ...
</Tabs>`;

/** How to put tabs on a page. */
export function Usage(): JSX.Element {
  return (
    <section aria-labelledby="usage">
      <h2 id="usage">Usage</h2>
      <p>
        Give each <code>TabsTab</code> a <code>value</code>, and a <code>TabsPanel</code> with the same value. Name the
        list with <code>aria-label</code>, or <code>aria-labelledby</code> pointing at a visible heading.
      </p>
      <pre>
        <code>{usage}</code>
      </pre>
      <p>
        Pass <code>value</code> and <code>onValueChange</code> to own the selection. The value type is inferred, so a
        union of tab values stays typed.
      </p>
      <pre>
        <code>{controlled}</code>
      </pre>
      <p>
        <code>orientation=&quot;vertical&quot;</code> stacks the tabs and moves between them with Up and Down.{' '}
        <code>activation=&quot;manual&quot;</code> waits for Enter or Space before showing a panel, for panels that are
        slow to render.
      </p>
    </section>
  );
}
